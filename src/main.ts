import * as Vue from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import './styles/theme.css'
import App from './App'
import router from './router'

// 检测是否在插件弹窗环境中
function detectExtensionEnvironment() {
    // 检测是否在Chrome扩展环境中
    const isExtension = typeof chrome !== 'undefined' && chrome.runtime
    
    // 检测窗口大小，插件弹窗通常有固定的小尺寸
    const isSmallWindow = window.innerWidth < 500 && window.innerHeight < 700
    
    // 检测URL是否包含extension协议
    const isExtensionUrl = window.location.protocol === 'chrome-extension:' || 
                          window.location.protocol === 'moz-extension:'
    
    // 检测是否为弹窗环境（通过window对象的特征）
    const isPopupWindow = window.opener === null && window.parent === window
    
    return isExtension && (isSmallWindow || isExtensionUrl || isPopupWindow)
}

// 如果在插件环境中，添加CSS类
if (detectExtensionEnvironment()) {
    document.documentElement.classList.add('extension-popup')
    document.body.classList.add('extension-popup')
}

const app = Vue.createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(ElementPlus)

app.mount('#app') 