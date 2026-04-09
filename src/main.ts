import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { safeHtmlDirective, safeSvgDirective } from '@/directives/v-safe-html'
import { log } from '@/utils/logger'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.directive('safe-html', safeHtmlDirective)
app.directive('safe-svg', safeSvgDirective)

app.config.errorHandler = (err, instance, info) => {
  log.error('[Vue Error]', { error: err, component: instance?.$options?.name, info })
}

app.mount('#app')
