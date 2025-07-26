// Detect the type of current browser
const getBrowser = () => {
    if (typeof browser !== 'undefined') {
        return 'firefox'
    }
    if (typeof chrome !== 'undefined') {
        if (navigator.userAgent.includes('Edg/')) {
            return 'edge'
        }
        return 'chrome'
    }
    return 'unknown'
}

// Unified browser API interface
const browserAPI = {
    runtime: {
        onStartup: {
            addListener: (callback) => {
                if (getBrowser() === 'firefox') {
                    browser.runtime.onStartup.addListener(callback)
                } else {
                    chrome.runtime.onStartup.addListener(callback)
                }
            }
        },
        onInstalled: {
            addListener: (callback) => {
                if (getBrowser() === 'firefox') {
                    browser.runtime.onInstalled.addListener(callback)
                } else {
                    chrome.runtime.onInstalled.addListener(callback)
                }
            }
        }
    },
    notifications: {
        create: async (options) => {
            const notificationId = `conference-notification-${Date.now()}`
            const notificationOptions = {
                type: 'basic',
                iconUrl: '/icons/chateda-16.png',
                title: 'ChatEDA AcadBot',
                priority: 2,
                ...options
            }
            if (getBrowser() === 'firefox') {
                await browser.notifications.create(notificationId, notificationOptions)
            } else {
                await chrome.notifications.create(notificationId, notificationOptions)
            }
        }
    },
    alarms: {
        create: (name, alarmInfo) => {
            if (getBrowser() === 'firefox') {
                browser.alarms.create(name, alarmInfo)
            } else {
                chrome.alarms.create(name, alarmInfo)
            }
        },
        onAlarm: {
            addListener: (callback) => {
                if (getBrowser() === 'firefox') {
                    browser.alarms.onAlarm.addListener(callback)
                } else {
                    chrome.alarms.onAlarm.addListener(callback)
                }
            }
        }
    },
    storage: {
        sync: {
            get: async (keys) => {
                if (getBrowser() === 'firefox') {
                    return await browser.storage.sync.get(keys)
                } else {
                    return await chrome.storage.sync.get(keys)
                }
            }
        }
    }
}

// Listen for timer triggers
browserAPI.alarms.onAlarm.addListener(async (alarm) => {
    // Check if it is a conference reminder
    if (alarm.name.startsWith('conference-')) {
        const [_, conferenceId, type, days] = alarm.name.split('-')

        // Get conference information from storage
        try {
            const result = await browserAPI.storage.sync.get(['subscriptions'])
            const subscriptions = result.subscriptions || []
            const conference = subscriptions.find(conf => conf.id === conferenceId)

            if (conference) {
                // Construct messages based on alert type
                const message = type === 'deadline' ?
                    `Only ${days} days left until the ${conference.title} ${conference.year} deadline! Submit your paper now.` :
                    `${conference.title} ${conference.year} will commence in ${days} days. Please prepare for your participation!`

                // Show Notifications
                await browserAPI.notifications.create({
                    message
                })
            }
        } catch (error) {
            console.error('Error processing reminder:', error)
        }
    }
})

// Preload data on browser startup
browserAPI.runtime.onStartup.addListener(async () => {
    try {
        // Preloading Data
        const response = await fetch(
            'https://api.github.com/repos/chateda-ichip/ConfTrack/contents/conference?ref=main'
        )

        if (!response.ok) {
            throw new Error(`GitHub API Response Error: ${response.status}`)
        }
    } catch (error) {
        console.error('Failed to preload data:', error)
    }
})

// Preload data when installing or updating
browserAPI.runtime.onInstalled.addListener(async () => {
    try {
        // Preloading Data
        const response = await fetch(
            'https://api.github.com/repos/chateda-ichip/ConfTrack/contents/conference?ref=main'
        )

        if (!response.ok) {
            throw new Error(`GitHub API Response Error: ${response.status}`)
        }

        // Show welcome notification
        await browserAPI.notifications.create({
            message: 'ChatEDA Plugin successfully installed! Begin subscribing to your preferred conferences now.'
        })
    } catch (error) {
        console.error('Preload data failed:', error)
    }
}) 