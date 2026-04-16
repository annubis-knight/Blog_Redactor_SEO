import { ref, computed, onScopeDispose } from 'vue'
import { defineStore } from 'pinia'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  message: string
  duration: number
}

const MAX_VISIBLE = 5

let counter = 0

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref<Notification[]>([])
  const timers = new Map<string, ReturnType<typeof setTimeout>>()

  const hasNotifications = computed(() => notifications.value.length > 0)

  onScopeDispose(() => {
    timers.forEach(clearTimeout)
    timers.clear()
  })

  function add(type: NotificationType, message: string, duration?: number) {
    const effectiveDuration = duration ?? (type === 'error' ? 8000 : 5000)
    const id = `notif-${++counter}`
    const notification: Notification = { id, type, message, duration: effectiveDuration }

    notifications.value.push(notification)

    // Trim to max visible
    if (notifications.value.length > MAX_VISIBLE) {
      const removed = notifications.value.splice(0, notifications.value.length - MAX_VISIBLE)
      removed.forEach(n => {
        const timer = timers.get(n.id)
        if (timer) {
          clearTimeout(timer)
          timers.delete(n.id)
        }
      })
    }

    // Auto-dismiss
    const timer = setTimeout(() => {
      remove(id)
    }, effectiveDuration)
    timers.set(id, timer)

    return id
  }

  function remove(id: string) {
    const timer = timers.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.delete(id)
    }
    notifications.value = notifications.value.filter(n => n.id !== id)
  }

  function success(message: string, duration?: number) {
    return add('success', message, duration)
  }

  function error(message: string, duration?: number) {
    return add('error', message, duration)
  }

  function warning(message: string, duration?: number) {
    return add('warning', message, duration)
  }

  function info(message: string, duration?: number) {
    return add('info', message, duration)
  }

  return { notifications, hasNotifications, add, remove, success, error, warning, info }
})
