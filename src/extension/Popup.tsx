import { defineComponent, ref, onMounted } from 'vue'
import { ElButton } from 'element-plus'
import { preloadConferences, type Conference } from '@/utils/conference'

export default defineComponent({
    name: 'Popup',
    setup() {
        const conferences = ref<Conference[]>([])
        const loading = ref(true)
        const error = ref<string | null>(null)

        const loadData = async () => {
            try {
                loading.value = true
                error.value = null
                conferences.value = await preloadConferences()
            } catch (e) {
                console.error('Failed to load conference data:', e)
                error.value = e instanceof Error ? e.message : 'Failed to load conference data'
            } finally {
                loading.value = false
            }
        }

        onMounted(() => {
            loadData()
        })

        return () => (
            <div class="p-4">
                <div class="flex justify-between items-center mb-4">
                    <h1 class="text-xl font-bold">ChatEDA-AcadBot</h1>
                </div>

                {loading.value ? (
                    <div class="text-center py-4">Loading...</div>
                ) : error.value ? (
                    <div class="text-red-500 py-4">{error.value}</div>
                ) : (
                    <div class="space-y-4">
                        {conferences.value.slice(0, 5).map(conf => (
                            <div key={conf.title} class="border p-3 rounded-lg">
                                <h2 class="font-semibold">{conf.title}</h2>
                                <p class="text-sm text-gray-600">{conf.description}</p>
                                {conf.years[0] && (
                                    <div class="mt-2 text-sm">
                                        <div>Deadline: {conf.years[0].deadline}</div>
                                        <div>Conference Time: {conf.years[0].date}</div>
                                    </div>
                                )}
                            </div>
                        ))}
                        <div class="text-center mt-4">
                            <ElButton type="primary" onClick={() => window.open('index.html', '_blank')}>
                                View more meeting information
                            </ElButton>
                        </div>
                    </div>
                )}
            </div>
        )
    }
}) 