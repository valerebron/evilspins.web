import { createApp } from 'vue'
import './style.css'
import 'evilspins-player/style.css'
import App from './App.vue'
import { router } from './router'

// GitHub Pages has no SPA fallback: public/404.html sends deep links here as /?p=<path>.
// Restore the real path before the router reads the location.
const redirect = new URLSearchParams(window.location.search).get('p')
if (redirect?.startsWith('/')) {
  window.history.replaceState(null, '', redirect)
}

createApp(App)
  .use(router)
  .mount('#app')
