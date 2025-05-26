import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'

// FontAwesome imports
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faRotateRight, faList, faStar, faCrosshairs } from '@fortawesome/free-solid-svg-icons'

// Add icons to library
library.add(faRotateRight, faList, faStar, faCrosshairs)

const app = createApp(App)
app.component('font-awesome-icon', FontAwesomeIcon)
app.mount('#app')
