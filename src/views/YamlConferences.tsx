import { defineComponent } from 'vue'

export default defineComponent({
    name: 'YamlConferences',
    setup() {
        return () => (
            <div class="container mx-auto px-4 py-8">
                <h1 class="text-2xl font-bold mb-4">YAML Meeting List</h1>
                <div class="bg-white rounded-lg shadow p-6">
                    <p class="text-gray-600">No meeting information</p>
                </div>
            </div>
        )
    }
}) 