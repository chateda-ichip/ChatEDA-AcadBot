import { defineComponent } from 'vue'

export default defineComponent({
    name: 'Submissions',
    setup() {
        return () => (
            <div class="container mx-auto px-4 py-8">
                <h1 class="text-2xl font-bold mb-4">My Contributions</h1>
                <div class="bg-white rounded-lg shadow p-6">
                    <p class="text-gray-600">No submission record</p>
                </div>
            </div>
        )
    }
}) 