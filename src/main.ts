import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import panZoom from 'vue-panzoom' // @ts-ignore

const app = createApp(App)
app.use(panZoom)
app.mount('#app')
