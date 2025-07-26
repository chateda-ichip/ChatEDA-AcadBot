import { defineComponent, ref, onMounted, computed } from "vue"
import {
    ElCard,
    ElTag,
    ElDivider,
    ElSkeleton,
    ElAlert,
    ElButton,
    ElIcon,
    ElEmpty,
    ElTooltip,
    ElBadge,
    ElMessage,
    ElInput,
    ElTimeline,
    ElTimelineItem
} from "element-plus"
import {
    Calendar,
    MapLocation,
    Clock,
    Link,
    InfoFilled,
    Star,
    Document,
    Timer,
    Check,
    Search
} from "@element-plus/icons-vue"
import { loadSubscriptions, addSubscription, removeSubscription } from '@/services/storage'
import { createConferenceReminder, cancelConferenceReminder, showNotification } from '@/services/notification'
import { loadConferences, preloadConferences, isDateInPast, type Conference } from "../utils/conference"

interface PreloadMessage {
    type: 'PRELOAD_START' | 'PRELOAD_COMPLETE' | 'PRELOAD_ERROR'
    error?: string
}

export default defineComponent({
    name: "Conferences",
    setup() {
        const conferences = ref<Conference[]>([])
        const loading = ref(true)
        const error = ref<string | null>(null)
        const searchQuery = ref("")
        const categoryOptions = ["Computer Architecture", "Circuit Design", "Device", "EDA"]
        const selectedCategories = ref<string[]>([...categoryOptions])
        const subscribedConferences = ref(new Set<string>())

        // Loading conference data
        const loadConferenceData = async () => {
            try {
                loading.value = true
                error.value = null

                // Load meeting data (cached automatically)
                const data = await preloadConferences()
                console.log('加载到的会议数据:', data)
                conferences.value = data

                // Load subscription information
                await loadSubscribedConferences()
            } catch (e) {
                console.error('Failed to load conference data:', e)
                error.value = e instanceof Error ? e.message : 'Failed to load conference data'
            } finally {
                loading.value = false
            }
        }

        // Load subscribed meetings
        const loadSubscribedConferences = async () => {
            try {
                const subs = await loadSubscriptions()
                subscribedConferences.value = new Set(subs.map(sub => sub.id))
            } catch (error) {
                console.error('Failed to load subscription information:', error)
            }
        }

        // Handling subscription/unsubscription
        const handleSubscription = async (conf: Conference, year: ConferenceYear) => {
            try {
                const confId = year.id || `${conf.title}-${year.year}`
                const isCurrentlySubscribed = subscribedConferences.value.has(confId)

                if (isCurrentlySubscribed) {
                    // Unsubscribe
                    await removeSubscription(confId)
                    subscribedConferences.value.delete(confId)
                    await cancelConferenceReminder(confId)
                    await showNotification(
                        'Unsubscribe successfully',
                        `Cancelled ${conf.title} ${year.year}'s Reminder`
                    )
                } else {
                    // Add Subscription
                    const subscription = {
                        id: confId,
                        title: conf.title,
                        year: year.year,
                        deadline: year.deadline,
                        date: year.date
                    }
                    await addSubscription(subscription)
                    subscribedConferences.value.add(confId)
                    await createConferenceReminder(subscription)
                    await showNotification(
                        'Subscription Success',
                        `Subscribed to you for deadlines and conference reminders for ${conf.title} ${year.year}`
                    )
                }
            } catch (error) {
                console.error('Handling subscription failures:', error)
                ElMessage.error('Operation failed, please try again')
            }
        }

        // Monitor preload status
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.onMessage.addListener((message: PreloadMessage) => {
                if (message.type === 'PRELOAD_START') {
                    loading.value = true
                } else if (message.type === 'PRELOAD_COMPLETE') {
                    loadConferenceData()
                } else if (message.type === 'PRELOAD_ERROR') {
                    error.value = `Preload failed: ${message.error}`
                    loading.value = false
                }
            })
        }

        onMounted(loadConferenceData)

        // Formatting Dates
        const formatDate = (dateStr: string) => {
            try {
                const cleanDateStr = dateStr.replace(/['"]/g, '').trim()
                const date = new Date(cleanDateStr)
                if (isNaN(date.getTime())) {
                    return dateStr // Returns the original string if the date is invalid
                }
                return date.toLocaleString("en", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                })
            } catch (err) {
                console.error("Date formatting error:", err, dateStr)
                return dateStr
            }
        }

        // Calculate the remaining days
        const getDaysRemaining = (deadlineStr: string) => {
            try {
                const cleanDeadlineStr = deadlineStr.replace(/['"]/g, '').trim()
                const deadlineDate = new Date(cleanDeadlineStr)
                const today = new Date()
                deadlineDate.setHours(0, 0, 0, 0)
                today.setHours(0, 0, 0, 0)
                const diffMs = deadlineDate.getTime() - today.getTime()
                return Math.round(diffMs / (24 * 60 * 60 * 1000))
            } catch (err) {
                console.error("Error in calculating remaining days:", err, deadlineStr)
                return 0
            }
        }

        // Calculate the number of days left until a meeting starts
        const getDaysToConference = (dateStr: string) => {
            try {
                const cleanDateStr = dateStr.replace(/['"]/g, '').trim()
                const date = new Date(cleanDateStr)
                const today = new Date()
                date.setHours(0, 0, 0, 0)
                today.setHours(0, 0, 0, 0)
                const diffMs = date.getTime() - today.getTime()
                return Math.max(0, Math.round(diffMs / (24 * 60 * 60 * 1000)))
            } catch (err) {
                console.error("Error in calculating the number of days until the meeting:", err, dateStr)
                return 0
            }
        }

        // Check if the date has been missed
        const isDatePassed = (dateStr: string) => {
            try {
                const cleanDateStr = dateStr.replace(/['"]/g, '').trim()
                const date = new Date(cleanDateStr)
                const today = new Date()
                date.setHours(0, 0, 0, 0)
                today.setHours(0, 0, 0, 0)
                return date.getTime() < today.getTime()
            } catch (err) {
                console.error("Error in checking if date has been missed:", err, dateStr)
                return false
            }
        }

        // Get the timeline item type
        const getTimelineItemType = (dateStr: string) => {
            if (isDatePassed(dateStr)) {
                return 'success' // Expired Date
            }

            const days = getDaysToConference(dateStr)
            if (days <= 7) {
                return 'danger' // Within 7 days
            } else if (days <= 30) {
                return 'warning' // Within 30 days
            }

            return 'primary' // default
        }

        // Determine if a meeting is coming soon
        const isUpcoming = (dateStr: string) => {
            try {
                const cleanDateStr = dateStr.replace(/['"]/g, '').trim()
                const date = new Date(cleanDateStr)
                const today = new Date()
                date.setHours(0, 0, 0, 0)
                today.setHours(0, 0, 0, 0)
                return date.getTime() >= today.getTime()
            } catch (err) {
                console.error("Error in determining whether a meeting is coming soon:", err, dateStr)
                return false
            }
        }

        // Get the status tag type
        const getStatusType = (conf: Conference) => {
            try {
                const today = new Date()
                today.setHours(0, 0, 0, 0)

                const deadlineStr = conf.years[0].deadline.replace(/['"]/g, '').trim()
                const deadlineDate = new Date(deadlineStr)
                deadlineDate.setHours(0, 0, 0, 0)

                const confDateStr = conf.years[0].date.replace(/['"]/g, '').trim()
                const confDate = new Date(confDateStr)
                confDate.setHours(0, 0, 0, 0)

                if (today.getTime() > confDate.getTime()) {
                    return 'info' // Ended
                } else if (today.getTime() === confDate.getTime()) {
                    return 'success' // in progress
                } else if (today.getTime() >= deadlineDate.getTime()) {
                    return 'warning' // Submission Deadline
                } else {
                    return 'danger' // Open submission
                }
            } catch (err) {
                console.error("Error in getting status tag type:", err, conf)
                return 'info'
            }
        }

        // Get status text
        const getStatusText = (conference: Conference) => {
            try {
                const today = new Date()
                today.setHours(0, 0, 0, 0)

                const deadlineStr = conference.years[0].deadline.replace(/['"]/g, '').trim()
                const deadlineDate = new Date(deadlineStr)
                deadlineDate.setHours(0, 0, 0, 0)

                const confDateStr = conference.years[0].date.replace(/['"]/g, '').trim()
                const confDate = new Date(confDateStr)
                confDate.setHours(0, 0, 0, 0)

                if (today.getTime() > confDate.getTime()) {
                    return 'Ended'
                } else if (today.getTime() === confDate.getTime()) {
                    return 'Ongoing'
                } else if (today.getTime() >= deadlineDate.getTime()) {
                    return 'Submission Deadline'
                } else {
                    return 'Open Submission'
                }
            } catch (err) {
                console.error("Error getting status text:", err, conference)
                return 'Status unknown'
            }
        }

        // Get the conference status weight (for sorting)
        const getStatusWeight = (conference: Conference) => {
            try {
                const today = new Date()
                today.setHours(0, 0, 0, 0)

                const deadlineStr = conference.years[0].deadline.replace(/['"]/g, '').trim()
                const deadlineDate = new Date(deadlineStr)
                deadlineDate.setHours(0, 0, 0, 0)

                const confDateStr = conference.years[0].date.replace(/['"]/g, '').trim()
                const confDate = new Date(confDateStr)
                confDate.setHours(0, 0, 0, 0)

                if (today.getTime() === confDate.getTime()) {
                    return 0 // Ongoing meetings take priority
                } else if (today.getTime() < confDate.getTime()) {
                    return 1 // Followed by upcoming conferences
                } else {
                    return 2 // Ended meeting last
                }
            } catch (err) {
                return 3 // Put error cases last
            }
        }

        // Select/Unselect All Categories
        const toggleAllCategories = () => {
            if (selectedCategories.value.length === categoryOptions.length) {
                selectedCategories.value = []
            } else {
                selectedCategories.value = [...categoryOptions]
            }
        }

        // Get the conference display ID
        const getConferenceId = (conf: Conference) => {
            return conf.id || conf.years[0]?.id || conf.title.replace(/\s+/g, '').toLowerCase()
        }

        // Filter and sort conferences
        const filteredConferences = computed(() => {
            console.log('Conference data before filtering:', conferences.value)
            console.log('Currently selected category:', selectedCategories.value)

            // If no category is selected, all conferences are displayed
            const showAllConferences = selectedCategories.value.length === 0

            const filtered = conferences.value
                .filter(conf => {
                    const confId = getConferenceId(conf)
                    // Category Filter
                    const categoryMatch = showAllConferences || selectedCategories.value.includes(conf.sub || '')
                    console.log(`Conference ${confId} Category ${conf.sub} Matching results:`, categoryMatch)

                    // Search Filter
                    const searchLower = searchQuery.value.toLowerCase()
                    const searchMatch = searchQuery.value === '' ||
                        confId.toLowerCase().includes(searchLower) ||
                        conf.title.toLowerCase().includes(searchLower) ||
                        conf.description.toLowerCase().includes(searchLower) ||
                        (conf.sub || '').toLowerCase().includes(searchLower)
                    console.log(`Search results for conference ${confId}:`, searchMatch)

                    return categoryMatch && searchMatch
                })
                .sort((a, b) => {
                    // Sort by status first
                    const weightA = getStatusWeight(a)
                    const weightB = getStatusWeight(b)
                    if (weightA !== weightB) {
                        return weightA - weightB
                    }
                    // Sort by meeting name when status is the same
                    return a.title.localeCompare(b.title)
                })

            console.log('Filtered meeting data:', filtered)
            return filtered
        })

        return () => (
            <div class="max-w-6xl mx-auto p-4 md:p-8 min-h-screen">
                {/* 现代化的标题区域 */}
                <div class="header-section bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 rounded-xl mb-8 p-8 border border-slate-200/50 dark:border-slate-700/50">
                    <div class="flex items-center justify-between mb-6">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                                <ElIcon size="24" class="text-white">
                                    <Document />
                                </ElIcon>
                            </div>
                            <div>
                                <h1 class="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent leading-tight">
                                    ChatEDA-AcadBot
                                </h1>
                                <p class="text-slate-600 dark:text-slate-300 text-lg mt-1">
                                    Conference Submission & Attendance Helper
                                </p>
                            </div>
                        </div>
                        <div class="hidden md:flex flex-col items-end text-right">
                            <div class="text-sm text-slate-500 dark:text-slate-400 mb-1">
                                Total Conferences
                            </div>
                            <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {conferences.value.length}
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-300">
                        <div class="flex items-center gap-2">
                            <ElIcon class="text-green-600"><Check /></ElIcon>
                            <span>Real-time Updates</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <ElIcon class="text-blue-600"><Star /></ElIcon>
                            <span>Subscription Management</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <ElIcon class="text-purple-600"><Timer /></ElIcon>
                            <span>Deadline Tracking</span>
                        </div>
                    </div>
                </div>

                {/* Search and filter areas */}
                <div class="filter-section bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200/50 dark:border-slate-700/50 mb-8">
                    <div class="flex flex-col gap-6">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <ElIcon class="text-slate-600 dark:text-slate-400"><InfoFilled /></ElIcon>
                                <h3 class="text-lg font-semibold text-slate-800 dark:text-slate-200">Filter & Search</h3>
                            </div>
                            <ElButton
                                type="text"
                                size="small"
                                onClick={toggleAllCategories}
                                class="!text-sm !text-blue-600 dark:!text-blue-400 hover:!bg-blue-50 dark:hover:!bg-blue-900/20 !px-3 !py-1.5 !rounded-lg !font-medium"
                            >
                                {selectedCategories.value.length === categoryOptions.length ? 'Deselect All' : 'Select All'}
                            </ElButton>
                        </div>

                        <div class="flex flex-wrap gap-3">
                            {categoryOptions.map(category => (
                                <ElTag
                                    key={category}
                                    class={`category-tag cursor-pointer transition-all duration-200 hover:scale-105 ${selectedCategories.value.includes(category) ? 'selected' : ''}`}
                                    effect="plain"
                                    size="large"
                                    onClick={() => {
                                        if (selectedCategories.value.includes(category)) {
                                            selectedCategories.value = selectedCategories.value.filter(c => c !== category)
                                        } else {
                                            selectedCategories.value = [...selectedCategories.value, category]
                                        }
                                    }}
                                >
                                    <span class="font-medium">{category}</span>
                                    {selectedCategories.value.includes(category) && (
                                        <ElIcon class="ml-2 text-green-600"><Check /></ElIcon>
                                    )}
                                </ElTag>
                            ))}
                        </div>

                        <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                            <ElInput
                                v-model={searchQuery.value}
                                placeholder="Search for conference ID, title, or description..."
                                class="!max-w-md"
                                clearable
                                prefix-icon={Search}
                                size="large"
                            />
                            
                            <div class="text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 px-4 py-2 rounded-lg">
                                <span class="font-medium text-blue-600 dark:text-blue-400">{selectedCategories.value.length}</span> categories selected, 
                                <span class="font-medium text-green-600 dark:text-green-400 ml-1">{filteredConferences.value.length}</span> conferences found
                            </div>
                        </div>
                    </div>
                </div>

                {/* Loading Status */}
                {loading.value ? (
                    <div class="space-y-4">
                        {[1, 2, 3].map(i => (
                            <ElSkeleton key={i} animated loading={loading.value}>
                                <template>
                                    <div class="h-32"></div>
                                </template>
                            </ElSkeleton>
                        ))}
                    </div>
                ) : error.value ? (
                    <ElAlert
                        type="error"
                        title="Loading failed"
                        description={error.value}
                        show-icon
                        closable={false}
                        class="mb-4"
                    />
                ) : filteredConferences.value.length === 0 ? (
                    <ElEmpty description="No matching conferences found" />
                ) : (
                    <div class="space-y-6">
                        {filteredConferences.value.map(conf => {
                            const latestYear = conf.years[0];
                            const daysRemaining = getDaysRemaining(latestYear.deadline);
                            const statusType = getStatusType(conf);
                            const statusText = getStatusText(conf);
                            const isSubscribed = subscribedConferences.value.has(latestYear.id || `${conf.title}-${latestYear.year}`);
                            const isConferenceOver = isDateInPast(latestYear.date);
                            const isDeadlineOver = isDateInPast(latestYear.deadline);

                            return (
                                <ElCard
                                    key={conf.title}
                                    class={`group transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border-0 shadow-lg bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-900/50 backdrop-blur-sm ${isConferenceOver ? 'opacity-60' : ''}`}
                                    shadow="hover"
                                >
                                    <div class="flex flex-col">
                                        {/* Conference title and status */}
                                        <div class="flex justify-between items-start mb-6">
                                            <div class="flex-1">
                                                <div class="flex items-center gap-3 flex-wrap mb-3">
                                                    <div class="flex flex-col">
                                                        {false && getConferenceId(conf) && (
                                                            <span class="text-xs font-mono text-slate-500 dark:text-slate-400 mb-1 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                                                                {getConferenceId(conf)}
                                                            </span>
                                                        )}
                                                        <h2 class={`text-2xl font-bold leading-tight ${isConferenceOver ? 'line-through text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                                                            {conf.title} 
                                                            <span class="text-blue-600 dark:text-blue-400 ml-2 font-semibold">
                                                                {latestYear.year}
                                                            </span>
                                                        </h2>
                                                    </div>
                                                </div>
                                                
                                                <div class="flex items-center gap-2 flex-wrap mb-3">
                                                    <ElTag type={statusType} size="large" effect="dark" class="px-3 py-1 font-medium">
                                                        {statusText}
                                                    </ElTag>
                                                    <ElTag type="info" size="default" effect="plain" class="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/50">
                                                        {conf.sub}
                                                    </ElTag>
                                                    {conf.rank && (
                                                        <ElTag type="warning" size="default" effect="plain" class="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/50">
                                                            {conf.rank}
                                                        </ElTag>
                                                    )}
                                                </div>
                                                
                                                <p class="text-slate-600 dark:text-slate-300 leading-relaxed">
                                                    {conf.description}
                                                </p>
                                            </div>
                                            <div class="flex items-center gap-2 ml-4">
                                                <ElButton
                                                    type={isSubscribed ? 'success' : 'primary'}
                                                    size="default"
                                                    onClick={() => handleSubscription(conf, latestYear)}
                                                    class="px-4 py-2 font-medium shadow-md hover:shadow-lg transition-all duration-200"
                                                >
                                                    <ElIcon class="mr-2">
                                                        {isSubscribed ? <Star /> : <Star />}
                                                    </ElIcon>
                                                    {isSubscribed ? 'Subscribed' : 'Subscribe'}
                                                </ElButton>
                                            </div>
                                        </div>

                                        {/* Conference details */}
                                        <div class="bg-gradient-to-r from-slate-50/80 to-blue-50/30 dark:from-slate-800/50 dark:to-slate-700/30 rounded-xl p-5 mb-6 border border-slate-200/50 dark:border-slate-600/30">
                                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div class="space-y-3">
                                                    <div class="flex items-center gap-3">
                                                        <div class="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                                                            <ElIcon class="text-blue-600 dark:text-blue-400"><Calendar /></ElIcon>
                                                        </div>
                                                        <div>
                                                            <span class="text-sm font-medium text-slate-700 dark:text-slate-300">Conference Date:</span>
                                                            <div class="text-base font-semibold text-slate-900 dark:text-white">{formatDate(latestYear.date)}</div>
                                                            {isUpcoming(latestYear.date) && (
                                                                <ElTag size="small" type="info" class="mt-1">
                                                                    {getDaysToConference(latestYear.date)} days remaining
                                                                </ElTag>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div class="flex items-center gap-3">
                                                        <div class="w-8 h-8 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center">
                                                            <ElIcon class="text-green-600 dark:text-green-400"><MapLocation /></ElIcon>
                                                        </div>
                                                        <div>
                                                            <span class="text-sm font-medium text-slate-700 dark:text-slate-300">Location:</span>
                                                            <div class="text-base font-semibold text-slate-900 dark:text-white">{latestYear.place}</div>
                                                        </div>
                                                    </div>

                                                    <div class="flex items-center gap-3">
                                                        <div class={`w-8 h-8 ${isDeadlineOver ? 'bg-red-100 dark:bg-red-900/50' : 'bg-orange-100 dark:bg-orange-900/50'} rounded-lg flex items-center justify-center`}>
                                                            <ElIcon class={isDeadlineOver ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}><Clock /></ElIcon>
                                                        </div>
                                                        <div>
                                                            <span class="text-sm font-medium text-slate-700 dark:text-slate-300">Submission Deadline:</span>
                                                            <div class={`text-base font-semibold ${isDeadlineOver ? 'text-red-600 dark:text-red-400 line-through' : 'text-slate-900 dark:text-white'}`}>
                                                                {formatDate(latestYear.deadline)}
                                                            </div>
                                                            {!isDeadlineOver && daysRemaining !== null && (
                                                                <ElTag 
                                                                    size="small" 
                                                                    type={daysRemaining <= 7 ? 'danger' : daysRemaining <= 30 ? 'warning' : 'success'}
                                                                    class="mt-1"
                                                                >
                                                                    {daysRemaining > 0 ? `${daysRemaining} days left` : 'Due today!'}
                                                                </ElTag>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="space-y-3">
                                                    <div class="flex items-center gap-3">
                                                        <div class="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
                                                            <ElIcon class="text-purple-600 dark:text-purple-400"><Document /></ElIcon>
                                                        </div>
                                                        <div>
                                                            <span class="text-sm font-medium text-slate-700 dark:text-slate-300">Abstract Deadline:</span>
                                                            <div class="text-base font-semibold text-slate-900 dark:text-white">
                                                                {latestYear.abstractDeadline ? formatDate(latestYear.abstractDeadline) : 'Not specified'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="flex items-center gap-3">
                                                        <div class="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center">
                                                            <ElIcon class="text-indigo-600 dark:text-indigo-400"><InfoFilled /></ElIcon>
                                                        </div>
                                                        <div>
                                                            <span class="text-sm font-medium text-slate-700 dark:text-slate-300">Timeline:</span>
                                                            <ElTimeline>
                                                                {latestYear.abstractDeadline && (
                                                                    <ElTimelineItem
                                                                        type={getTimelineItemType(latestYear.abstractDeadline)}
                                                                        size="large"
                                                                        hollow={!isDatePassed(latestYear.abstractDeadline)}
                                                                    >
                                                                        <p class={`text-sm ${isDatePassed(latestYear.abstractDeadline) ? 'opacity-70' : ''}`}>
                                                                            <span class="font-medium">Abstract Deadline:</span>{' '}
                                                                            <span class={isDatePassed(latestYear.abstractDeadline) ? 'line-through' : ''}>
                                                                                {formatDate(latestYear.abstractDeadline)}
                                                                            </span>
                                                                        </p>
                                                                    </ElTimelineItem>
                                                                )}
                                                                <ElTimelineItem
                                                                    type={getTimelineItemType(latestYear.deadline)}
                                                                    size="large"
                                                                    hollow={!isDatePassed(latestYear.deadline)}
                                                                >
                                                                    <p class={`text-sm ${isDatePassed(latestYear.deadline) ? 'opacity-70' : ''}`}>
                                                                        <span class="font-medium">Submission Deadline:</span>{' '}
                                                                        <span class={isDatePassed(latestYear.deadline) ? 'line-through' : ''}>
                                                                            {formatDate(latestYear.deadline)}
                                                                        </span>
                                                                    </p>
                                                                </ElTimelineItem>
                                                                <ElTimelineItem
                                                                    type={getTimelineItemType(latestYear.date)}
                                                                    size="large"
                                                                    hollow={!isDatePassed(latestYear.date)}
                                                                >
                                                                    <p class={`text-sm ${isDatePassed(latestYear.date) ? 'opacity-70' : ''}`}>
                                                                        <span class="font-medium">Conference Time:</span>{' '}
                                                                        <span class={isDatePassed(latestYear.date) ? 'line-through' : ''}>
                                                                            {formatDate(latestYear.date)}
                                                                        </span>
                                                                    </p>
                                                                </ElTimelineItem>
                                                                {latestYear.timeline?.map((item, index) => {
                                                                    const isPastDeadline = isDatePassed(item.deadline);
                                                                    return (
                                                                        <ElTimelineItem
                                                                            key={index}
                                                                            type={getTimelineItemType(item.deadline)}
                                                                            size="large"
                                                                            hollow={!isDatePassed(item.deadline)}
                                                                        >
                                                                            <p class={`text-sm ${isPastDeadline ? 'opacity-70' : ''}`}>
                                                                                <span class="font-medium">{item.name}:</span>{' '}
                                                                                <span class={isPastDeadline ? 'line-through' : ''}>
                                                                                    {formatDate(item.deadline)}
                                                                                </span>
                                                                            </p>
                                                                        </ElTimelineItem>
                                                                    );
                                                                })}
                                                            </ElTimeline>
                                                        </div>
                                                    </div>
                                                    <div class="flex items-center gap-3">
                                                        <div class="w-8 h-8 bg-teal-100 dark:bg-teal-900/50 rounded-lg flex items-center justify-center">
                                                            <ElIcon class="text-teal-600 dark:text-teal-400"><Link /></ElIcon>
                                                        </div>
                                                        <div>
                                                            <span class="text-sm font-medium text-slate-700 dark:text-slate-300">Official Site:</span>
                                                            {latestYear.link && (
                                                                <a href={latestYear.link} target="_blank" rel="noopener noreferrer" class="text-base font-semibold text-slate-900 dark:text-white hover:underline">
                                                                    {latestYear.link}
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div class="flex items-center gap-3">
                                                        <div class="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                                                            <ElIcon class="text-gray-600 dark:text-gray-400"><Document /></ElIcon>
                                                        </div>
                                                        <div>
                                                            <span class="text-sm font-medium text-slate-700 dark:text-slate-300">DBLP:</span>
                                                            {conf.dblp && (
                                                                <a href={`https://dblp.org/db/conf/${conf.dblp}/index.html`} target="_blank" rel="noopener noreferrer" class="text-base font-semibold text-slate-900 dark:text-white hover:underline">
                                                                    {conf.dblp}
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Button */}
                                        <div class="flex justify-between items-center pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                                            <div class="flex items-center gap-3">
                                                {latestYear.link && (
                                                    <ElButton
                                                        type="primary"
                                                        size="default"
                                                        onClick={() => window.open(latestYear.link, '_blank')}
                                                        class="shadow-md hover:shadow-lg transition-all duration-200"
                                                    >
                                                        <ElIcon class="mr-2"><Link /></ElIcon>
                                                        Official Site
                                                    </ElButton>
                                                )}
                                                {conf.dblp && (
                                                    <ElButton
                                                        type="info"
                                                        size="default"
                                                        onClick={() => window.open(`https://dblp.org/db/conf/${conf.dblp}/index.html`, '_blank')}
                                                        class="shadow-md hover:shadow-lg transition-all duration-200"
                                                    >
                                                        <ElIcon class="mr-2"><Document /></ElIcon>
                                                        DBLP
                                                    </ElButton>
                                                )}
                                            </div>
                                            <div class="text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 px-3 py-1.5 rounded-lg">
                                                <ElIcon class="mr-1 text-xs"><Timer /></ElIcon>
                                                Last Updated: {new Date().toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                </ElCard>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }
});
