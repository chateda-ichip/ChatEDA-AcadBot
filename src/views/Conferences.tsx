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
            <div class="conference-view">
                <div class="header">
                    <h1 class="title">
                        ChatEDA-AcadBot
                    </h1>
                    <p class="description">
                        Conference Submission & Attendance Helper
                    </p>

                    {/* Search and filter areas */}
                    <div class="filter-section bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm mb-6">
                        <div class="flex flex-col gap-4">
                            <div class="flex items-center justify-between">
                                <h3 class="text-sm font-medium text-slate-700 dark:text-slate-300">Conference Category</h3>
                                <ElButton
                                    type="text"
                                    size="small"
                                    onClick={toggleAllCategories}
                                    class="!text-xs"
                                >
                                    {selectedCategories.value.length === categoryOptions.length ? 'Deselect All' : 'Select All'}
                                </ElButton>
                            </div>

                            <div class="flex flex-wrap gap-2">
                                {categoryOptions.map(category => (
                                    <ElTag
                                        key={category}
                                        class={`category-tag cursor-pointer transition-all ${selectedCategories.value.includes(category) ? 'selected' : ''}`}
                                        effect="plain"
                                        onClick={() => {
                                            if (selectedCategories.value.includes(category)) {
                                                selectedCategories.value = selectedCategories.value.filter(c => c !== category)
                                            } else {
                                                selectedCategories.value = [...selectedCategories.value, category]
                                            }
                                        }}
                                    >
                                        {category}
                                        {selectedCategories.value.includes(category) && (
                                            <ElIcon class="ml-1"><Check /></ElIcon>
                                        )}
                                    </ElTag>
                                ))}
                            </div>

                            <ElInput
                                v-model={searchQuery.value}
                                placeholder="Search for conference ID, title, or description..."
                                class="!max-w-md"
                                clearable
                                prefix-icon={Search}
                            />

                            <div class="text-xs text-slate-500 dark:text-slate-400">
                                {selectedCategories.value.length} categories selected, {filteredConferences.value.length} total conferences
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
                                    class={`conference-card ${isConferenceOver ? 'opacity-70' : ''}`}
                                    shadow="hover"
                                >
                                    <div class="flex flex-col">
                                        {/* Conference title and status */}
                                        <div class="flex justify-between items-start mb-4">
                                            <div class="flex-1">
                                                <div class="flex items-center gap-2 flex-wrap">
                                                    <div class="flex flex-col">
                                                        {false && getConferenceId(conf) && (
                                                            <span class="text-xs font-mono text-slate-500 dark:text-slate-400 mb-1">
                                                                {getConferenceId(conf)}
                                                            </span>
                                                        )}
                                                        <h2 class={`text-xl font-bold ${isConferenceOver ? 'line-through text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                                                            {conf.title} {latestYear.year}
                                                        </h2>
                                                    </div>
                                                    <ElTag type={statusType} size="small" effect="dark" class="ml-2">
                                                        {statusText}
                                                    </ElTag>
                                                    <ElTag type="info" size="small" effect="plain">
                                                        {conf.sub}
                                                    </ElTag>
                                                    {conf.rank && (
                                                        <ElTag type="warning" size="small" effect="plain">
                                                            {conf.rank}
                                                        </ElTag>
                                                    )}
                                                </div>
                                                <p class="text-sm text-slate-600 dark:text-slate-300 mt-1">
                                                    {conf.description}
                                                </p>
                                            </div>
                                            <div class="flex items-center gap-2">
                                                <ElButton
                                                    type={isSubscribed ? 'success' : 'primary'}
                                                    size="small"
                                                    onClick={() => handleSubscription(conf, latestYear)}
                                                >
                                                    <ElIcon class="mr-1">
                                                        {isSubscribed ? <Star /> : <Star />}
                                                    </ElIcon>
                                                    {isSubscribed ? 'Subscribed' : 'Subscribe'}
                                                </ElButton>
                                            </div>
                                        </div>

                                        {/* Conference details */}
                                        <div class="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 mb-4">
                                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div class="space-y-2">
                                                    <div class="flex items-center gap-2">
                                                        <ElIcon><Calendar /></ElIcon>
                                                        <span class="text-sm font-medium">Conference Time:</span>
                                                        <span class="text-sm">{formatDate(latestYear.date)}</span>
                                                        {isUpcoming(latestYear.date) && (
                                                            <ElTag size="small" type="info">
                                                                Countdown: {getDaysToConference(latestYear.date)} days
                                                            </ElTag>
                                                        )}
                                                    </div>
                                                    <div class="flex items-center gap-2">
                                                        <ElIcon><MapLocation /></ElIcon>
                                                        <span class="text-sm font-medium">Location:</span>
                                                        <span class="text-sm">{latestYear.place}</span>
                                                    </div>
                                                </div>
                                                <div class="space-y-2">
                                                    <div class="flex items-center gap-2">
                                                        <ElIcon><Clock /></ElIcon>
                                                        <span class="text-sm font-medium">Deadline:</span>
                                                        <span class="text-sm">{formatDate(latestYear.deadline)}</span>
                                                        {daysRemaining > 0 && (
                                                            <ElTag size="small" type="danger">
                                                                Only {daysRemaining} days left!
                                                            </ElTag>
                                                        )}
                                                    </div>
                                                    {latestYear.abstractDeadline && (
                                                        <div class="flex items-center gap-2">
                                                            <ElIcon><Document /></ElIcon>
                                                            <span class="text-sm font-medium">Abstract Deadline:</span>
                                                            <span class="text-sm">{formatDate(latestYear.abstractDeadline)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Timeline */}
                                            <div class="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                                <h4 class="text-sm font-medium mb-3 flex items-center">
                                                    <ElIcon class="mr-1"><InfoFilled /></ElIcon>
                                                    Important Dates
                                                </h4>
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

                                        {/* Action Button */}
                                        <div class="flex justify-between items-center">
                                            <div class="flex items-center gap-2">
                                                {latestYear.link && (
                                                    <ElButton
                                                        type="primary"
                                                        size="small"
                                                        onClick={() => window.open(latestYear.link, '_blank')}
                                                    >
                                                        <ElIcon class="mr-1"><Link /></ElIcon>
                                                        Official Site
                                                    </ElButton>
                                                )}
                                                {conf.dblp && (
                                                    <ElButton
                                                        type="info"
                                                        size="small"
                                                        onClick={() => window.open(`https://dblp.org/db/conf/${conf.dblp}/index.html`, '_blank')}
                                                    >
                                                        DBLP
                                                    </ElButton>
                                                )}
                                            </div>
                                            <div class="text-xs text-slate-500 dark:text-slate-400">
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
    },
    styles: [
        `
        .conference-view {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem 1rem;
        }
        .header {
            margin-bottom: 2rem;
        }
        .title {
            font-size: 1.875rem;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 1rem;
        }
        .description {
            color: #64748b;
            margin-bottom: 1.5rem;
        }
        .conference-card {
            margin-bottom: 1.5rem;
            transition: all 0.3s ease;
        }
        .conference-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }
        @media (prefers-color-scheme: dark) {
            .title {
                color: #f8fafc;
            }
            .description {
                color: #94a3b8;
            }
        }
        .filter-section {
            border: 1px solid #e2e8f0;
        }
        .dark .filter-section {
            border-color: #334155;
        }
        .category-tag {
            transition: all 0.2s;
            border: 1px solid #e2e8f0;
            padding: 0 10px;
            height: 28px;
            line-height: 26px;
            border-radius: 4px;
            background: #f8fafc;
        }
        .dark .category-tag {
            border-color: #334155;
            background: #1e293b;
            color: #e2e8f0;
        }
        .category-tag.selected {
            background-color: #e0f2fe;
            color: #0369a1;
            border-color: #bae6fd;
        }
        .dark .category-tag.selected {
            background-color: #0c4a6e;
            color: #bae6fd;
            border-color: #0ea5e9;
        }
        `
    ]
});
