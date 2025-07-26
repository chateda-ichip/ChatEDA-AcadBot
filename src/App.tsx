import { defineComponent, ref, onMounted } from 'vue'
import { RouterView } from 'vue-router'

export default defineComponent({
    name: 'App',
    setup() {
        const isExtensionPopup = ref(false)

        onMounted(() => {
            // 检测是否在插件弹窗环境中
            const hasExtensionClass = document.documentElement.classList.contains('extension-popup')
            isExtensionPopup.value = hasExtensionClass
        })

        return () => (
            <div class={`w-full h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 ${
                isExtensionPopup.value ? 'overflow-y-auto' : 'overflow-y-auto'
            }`}>
                <RouterView />
            </div>
        )
    }
}) 