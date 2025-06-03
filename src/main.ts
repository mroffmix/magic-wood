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

// Service worker registration is now handled manually in App.vue
// Only register when user explicitly wants to save for offline
