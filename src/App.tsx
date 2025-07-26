import { defineComponent } from 'vue'
import { RouterView } from 'vue-router'

export default defineComponent({
    name: 'App',
    setup() {
        return () => (
            <div class="w-full h-full min-h-screen bg-white dark:bg-slate-900">
                <RouterView />
            </div>
        )
    }
}) 