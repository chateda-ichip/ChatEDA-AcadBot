import { defineComponent, ref, onMounted } from 'vue';
import ConferenceCard from '@/components/ConferenceCard';
export default defineComponent({
    name: 'Popup',
    setup() {
        const conferences = ref([]);
        onMounted(async () => {
            let url = 'src/data/conferences.json';
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                url = chrome.runtime.getURL('src/data/conferences.json');
            }
            const res = await fetch(url);
            const rawList = await res.json();
            // Adapt data structure, mock rank field
            conferences.value = rawList.map((item) => ({
                ...item,
                rank: {
                    ccf: 'A',
                    core: 'A*',
                    thcpl: 'A',
                },
                dblp: '',
            }));
        });
        return () => (<div class="w-80 min-h-60 bg-white dark:bg-gray-900 p-4 flex flex-col items-center overflow-y-auto">
            <div class="text-xl font-bold mb-4 text-center">Top conference submission browser plug-in</div>
            {conferences.value.length === 0 ? (<div class="w-full text-center py-8 text-gray-400">loading...</div>) : (conferences.value.flatMap((conf) => conf.confs.map((c) => (<ConferenceCard conference={c} rank={conf.rank} />))))}
        </div>);
    }
});
//# sourceMappingURL=Popup.jsx.map