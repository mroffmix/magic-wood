import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'

// FontAwesome imports
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faRotateRight, faList, faStar, faCrosshairs, faDownload } from '@fortawesome/free-solid-svg-icons'

// Add icons to library
library.add(faRotateRight, faList, faStar, faCrosshairs, faDownload)

const app = createApp(App)
app.component('font-awesome-icon', FontAwesomeIcon)
app.mount('#app')

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}
