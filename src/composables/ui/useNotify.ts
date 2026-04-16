import { useNotificationStore } from '@/stores/ui/notification.store'

export function useNotify() {
  const store = useNotificationStore()
  return {
    success: store.success,
    error: store.error,
    warning: store.warning,
    info: store.info,
  }
}
