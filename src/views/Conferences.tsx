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
            <div class="w-full p-3 sm:p-4 md:p-6 lg:p-8 h-full mx-auto max-w-7xl">
                {/* 自适应标题区域 */}
                <div class="header-section bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 rounded-lg mb-4 p-4 sm:p-6 border border-slate-200/50 dark:border-slate-700/50">
                    <div class="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                        <div class="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                            <ElIcon size="16" class="text-white">
                                <Document />
                            </ElIcon>
                        </div>
                        <div class="flex-1 min-w-0">
                            <h1 class="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent leading-tight">
                                ChatEDA-AcadBot
                            </h1>
                            <p class="text-slate-600 dark:text-slate-300 text-xs sm:text-sm md:text-base leading-tight">
                                Conference Submission & Attendance Helper
                            </p>
                        </div>
                        <div class="text-right">
                            <div class="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                                Total
                            </div>
                            <div class="text-lg sm:text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {conferences.value.length}
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex flex-wrap gap-2 sm:gap-3 md:gap-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                        <div class="flex items-center gap-1 sm:gap-2">
                            <ElIcon class="text-green-600 text-xs sm:text-sm"><Check /></ElIcon>
                            <span class="hidden sm:inline">Real-time </span><span>Updates</span>
                        </div>
                        <div class="flex items-center gap-1 sm:gap-2">
                            <ElIcon class="text-blue-600 text-xs sm:text-sm"><Star /></ElIcon>
                            <span class="hidden sm:inline">Subscription </span><span>Management</span>
                        </div>
                        <div class="flex items-center gap-1 sm:gap-2">
                            <ElIcon class="text-purple-600 text-xs sm:text-sm"><Timer /></ElIcon>
                            <span class="hidden sm:inline">Deadline </span><span>Tracking</span>
                        </div>
                    </div>
                </div>

                {/* 自适应筛选区域 */}
                <div class="filter-section bg-white dark:bg-slate-800 rounded-lg p-3 sm:p-4 md:p-6 shadow-sm border border-slate-200/50 dark:border-slate-700/50 mb-4 sm:mb-6">
                    <div class="flex flex-col gap-3 sm:gap-4 md:gap-6">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <ElIcon class="text-slate-600 dark:text-slate-400 hidden sm:block"><InfoFilled /></ElIcon>
                                <h3 class="text-sm sm:text-base md:text-lg font-semibold text-slate-800 dark:text-slate-200">
                                    <span class="sm:hidden">Filters</span>
                                    <span class="hidden sm:inline">Filter & Search</span>
                                </h3>
                            </div>
                            <ElButton
                                type="text"
                                size="small"
                                onClick={toggleAllCategories}
                                class="!text-xs sm:!text-sm !text-blue-600 dark:!text-blue-400 !px-2 !py-1 !rounded !font-medium"
                            >
                                <span class="sm:hidden">{selectedCategories.value.length === categoryOptions.length ? 'Clear' : 'All'}</span>
                                <span class="hidden sm:inline">{selectedCategories.value.length === categoryOptions.length ? 'Deselect All' : 'Select All'}</span>
                            </ElButton>
                        </div>

                        <div class="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 md:gap-4">
                            {categoryOptions.map(category => (
                                <ElTag
                                    key={category}
                                    class={`category-tag cursor-pointer transition-all duration-200 text-center justify-center hover:scale-105 hover:z-10 relative ${selectedCategories.value.includes(category) ? 'selected' : ''}`}
                                    effect="plain"
                                    size="small"
                                    onClick={() => {
                                        if (selectedCategories.value.includes(category)) {
                                            selectedCategories.value = selectedCategories.value.filter(c => c !== category)
                                        } else {
                                            selectedCategories.value = [...selectedCategories.value, category]
                                        }
                                    }}
                                >
                                    <span class="text-xs sm:text-sm font-medium">
                                        <span class="sm:hidden">{category.replace(' ', '\n')}</span>
                                        <span class="hidden sm:inline">{category}</span>
                                    </span>
                                    {selectedCategories.value.includes(category) && (
                                        <ElIcon class="ml-1 sm:ml-2 text-green-600 text-xs sm:text-sm"><Check /></ElIcon>
                                    )}
                                </ElTag>
                            ))}
                        </div>

                        <div class="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center">
                            <ElInput
                                v-model={searchQuery.value}
                                placeholder="Search conferences..."
                                clearable
                                prefix-icon={Search}
                                size="small"
                                class="w-full sm:max-w-md text-sm"
                            />
                            
                            <div class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 text-center sm:text-left bg-slate-50 dark:bg-slate-700/50 px-2 sm:px-3 py-1 sm:py-1.5 rounded">
                                <span class="font-medium text-blue-600 dark:text-blue-400">{selectedCategories.value.length}</span> categories, 
                                <span class="font-medium text-green-600 dark:text-green-400 ml-1">{filteredConferences.value.length}</span> found
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
                    <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
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
                                    class={`group transition-all duration-300 hover:scale-[1.01] hover:shadow-xl border-0 shadow-lg bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-900/50 backdrop-blur-sm ${isConferenceOver ? 'opacity-60' : ''}`}
                                    shadow="hover"
                                >
                                    <div class="flex flex-col">
                                        {/* Conference title and status */}
                                        <div class="flex justify-between items-start mb-4 sm:mb-6">
                                            <div class="flex-1">
                                                <div class="flex items-center gap-2 sm:gap-3 flex-wrap mb-3">
                                                    <div class="flex flex-col">
                                                        <h2 class={`text-lg sm:text-xl md:text-2xl font-bold leading-tight ${isConferenceOver ? 'line-through text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                                                            {conf.title} 
                                                            <span class="text-blue-600 dark:text-blue-400 ml-1 sm:ml-2 font-semibold">
                                                                {latestYear.year}
                                                            </span>
                                                        </h2>
                                                    </div>
                                                </div>
                                                
                                                <div class="flex items-center gap-2 flex-wrap mb-3">
                                                    <ElTag type={statusType} size="large" effect="dark" class="px-2 sm:px-3 py-1 font-medium">
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
                                                
                                                <p class="text-slate-600 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
                                                    {conf.description}
                                                </p>
                                            </div>
                                            <div class="flex items-center gap-2 ml-2 sm:ml-4">
                                                <ElButton
                                                    type={isSubscribed ? 'success' : 'primary'}
                                                    size="default"
                                                    onClick={() => handleSubscription(conf, latestYear)}
                                                    class="px-3 sm:px-4 py-2 font-medium shadow-md hover:shadow-lg transition-all duration-200"
                                                >
                                                    <ElIcon class="mr-1 sm:mr-2">
                                                        <Star />
                                                    </ElIcon>
                                                    <span class="hidden sm:inline">{isSubscribed ? 'Subscribed' : 'Subscribe'}</span>
                                                    <span class="sm:hidden">{isSubscribed ? 'Sub' : 'Sub'}</span>
                                                </ElButton>
                                            </div>
                                        </div>

                                        {/* Conference details */}
                                        <div class="bg-gradient-to-r from-slate-50/80 to-blue-50/30 dark:from-slate-800/50 dark:to-slate-700/30 rounded-xl p-4 sm:p-5 mb-4 sm:mb-6 border border-slate-200/50 dark:border-slate-600/30">
                                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                                <div class="space-y-3">
                                                    <div class="flex items-start gap-3">
                                                        <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                                                            <ElIcon class="text-blue-600 dark:text-blue-400"><Calendar /></ElIcon>
                                                        </div>
                                                        <div class="flex-1 min-w-0">
                                                            <span class="text-sm font-medium text-slate-700 dark:text-slate-300">Conference Date:</span>
                                                            <div class="text-base font-semibold text-slate-900 dark:text-white">{formatDate(latestYear.date)}</div>
                                                            {isUpcoming(latestYear.date) && (
                                                                <ElTag size="small" type="info" class="mt-1">
                                                                    {getDaysToConference(latestYear.date)} days remaining
                                                                </ElTag>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div class="flex items-start gap-3">
                                                        <div class="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                                                            <ElIcon class="text-green-600 dark:text-green-400"><MapLocation /></ElIcon>
                                                        </div>
                                                        <div class="flex-1 min-w-0">
                                                            <span class="text-sm font-medium text-slate-700 dark:text-slate-300">Location:</span>
                                                            <div class="text-base font-semibold text-slate-900 dark:text-white">{latestYear.place}</div>
                                                        </div>
                                                    </div>

                                                    <div class="flex items-start gap-3">
                                                        <div class={`w-10 h-10 ${isDeadlineOver ? 'bg-red-100 dark:bg-red-900/50' : 'bg-orange-100 dark:bg-orange-900/50'} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                                            <ElIcon class={isDeadlineOver ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}><Clock /></ElIcon>
                                                        </div>
                                                        <div class="flex-1 min-w-0">
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
                                                    <div class="flex items-start gap-3">
                                                        <div class="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                                                            <ElIcon class="text-purple-600 dark:text-purple-400"><Document /></ElIcon>
                                                        </div>
                                                        <div class="flex-1 min-w-0">
                                                            <span class="text-sm font-medium text-slate-700 dark:text-slate-300">Abstract Deadline:</span>
                                                            <div class="text-base font-semibold text-slate-900 dark:text-white">
                                                                {latestYear.abstractDeadline ? formatDate(latestYear.abstractDeadline) : 'Not specified'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Timeline */}
                                                    <div class="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                                        <h4 class="text-sm font-medium mb-3 flex items-center">
                                                            <ElIcon class="mr-1"><InfoFilled /></ElIcon>
                                                            Important Dates
                                                        </h4>
                                                        <div class="space-y-2">
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
                                                                        <span class="font-medium">Conference Date:</span>{' '}
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
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Button */}
                                        <div class="flex justify-between items-center pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                                            <div class="flex items-center gap-2 sm:gap-3">
                                                {latestYear.link && (
                                                    <ElButton
                                                        type="primary"
                                                        size="default"
                                                        onClick={() => window.open(latestYear.link, '_blank')}
                                                        class="shadow-md hover:shadow-lg transition-all duration-200"
                                                    >
                                                        <ElIcon class="mr-1 sm:mr-2"><Link /></ElIcon>
                                                        <span class="hidden sm:inline">Official Site</span>
                                                        <span class="sm:hidden">Site</span>
                                                    </ElButton>
                                                )}
                                                {conf.dblp && (
                                                    <ElButton
                                                        type="info"
                                                        size="default"
                                                        onClick={() => window.open(`https://dblp.org/db/conf/${conf.dblp}/index.html`, '_blank')}
                                                        class="shadow-md hover:shadow-lg transition-all duration-200"
                                                    >
                                                        <ElIcon class="mr-1 sm:mr-2"><Document /></ElIcon>
                                                        DBLP
                                                    </ElButton>
                                                )}
                                            </div>
                                            <div class="text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg">
                                                <ElIcon class="mr-1 text-xs"><Timer /></ElIcon>
                                                <span class="hidden sm:inline">Last Updated: </span>
                                                {new Date().toLocaleDateString()}
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
