import type { ConferenceSubscription } from './storage'

// Check Notification Permissions
export const checkNotificationPermission = async (): Promise<boolean> => {
    try {
        if (typeof chrome !== 'undefined' && chrome.notifications) {
            return true // The browser extension environment has permissions by default
        }

        if (!('Notification' in window)) {
            console.warn('The browser does not support notifications')
            return false
        }

        if (Notification.permission === 'granted') {
            return true
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission()
            return permission === 'granted'
        }

        return false
    } catch (error) {
        console.error('Failed to check notification permissions:', error)
        return false
    }
}

// Create a meeting reminder
export const createConferenceReminder = async (conference: ConferenceSubscription) => {
    try {
        // Check notification permissions first
        const hasPermission = await checkNotificationPermission()
        if (!hasPermission) {
            console.warn('No notification permission, can not create reminders')
            return
        }

        const alarmId = `conference-${conference.id}`
        const deadlineDate = new Date(conference.deadline)
        const conferenceDate = new Date(conference.date)
        const now = new Date()

        // Set deadline reminder time
        const deadlineReminders = [
            { days: 30, message: 'Submission countdown: 30 days remaining', type: 'deadline' },
            { days: 14, message: 'Submission countdown: 14 days remaining', type: 'deadline' },
            { days: 7, message: 'Submission countdown: 7 days remaining', type: 'deadline' },
            { days: 3, message: 'Submission countdown: 3 days remaining', type: 'deadline' },
            { days: 1, message: 'Submission countdown: 1 day remaining', type: 'deadline' }
        ]

        // Set the meeting reminder time
        const conferenceReminders = [
            { days: 30, message: '30-day countdown to the conference', type: 'conference' },
            { days: 14, message: '14-day countdown to the conference', type: 'conference' },
            { days: 7, message: '7-day countdown to the conference', type: 'conference' },
            { days: 3, message: '3-day countdown to the conference', type: 'conference' },
            { days: 1, message: '1-day countdown to the conference', type: 'conference' }
        ]

        // Send subscription confirmation notification
        await chrome.notifications.create({
            type: 'basic',
            iconUrl: '/icons/chateda-16.png',
            title: 'ChatEDA Plugin',
            message: `Subscription confirmed: You'll receive reminders for ${conference.title} ${conference.year} deadlines and events`,
            priority: 2
        })

        // Create a Deadline Reminder
        for (const reminder of deadlineReminders) {
            const reminderDate = new Date(deadlineDate)
            reminderDate.setDate(deadlineDate.getDate() - reminder.days)

            if (reminderDate > now) {
                const alarmInfo = {
                    when: reminderDate.getTime()
                }

                const alarmName = `${alarmId}-deadline-${reminder.days}`

                try {
                    await chrome.alarms.create(alarmName, alarmInfo)
                } catch (error) {
                    console.error('Failed to create deadline reminder:', error)
                }
            }
        }

        // Create a meeting reminder
        for (const reminder of conferenceReminders) {
            const reminderDate = new Date(conferenceDate)
            reminderDate.setDate(conferenceDate.getDate() - reminder.days)

            if (reminderDate > now) {
                const alarmInfo = {
                    when: reminderDate.getTime()
                }

                const alarmName = `${alarmId}-conference-${reminder.days}`

                try {
                    await chrome.alarms.create(alarmName, alarmInfo)
                } catch (error) {
                    console.error('Failed to create meeting reminder:', error)
                }
            }
        }
    } catch (error) {
        console.error('Failed to create meeting reminder:', error)
    }
}

// Show Notifications
export const showNotification = async (title: string, message: string) => {
    try {
        if (await checkNotificationPermission()) {
            await chrome.notifications.create({
                type: 'basic',
                iconUrl: '/icons/chateda-16.png',
                title: 'ChatEDA Plugin',
                message,
                priority: 2
            })
        }
    } catch (error) {
        console.error('Show notification failed:', error)
    }
}

// Cancel conference reminder
export const cancelConferenceReminder = async (conferenceId: string) => {
    try {
        const alarms = await chrome.alarms.getAll()
        const conferenceAlarms = alarms.filter(alarm =>
            alarm.name.startsWith(`conference-${conferenceId}`)
        )

        for (const alarm of conferenceAlarms) {
            await chrome.alarms.clear(alarm.name)
        }

        await chrome.notifications.create({
            type: 'basic',
            iconUrl: '/icons/chateda-16.png',
            title: 'ChatEDA Plugin',
            message: 'Cancelled conference reminder',
            priority: 2
        })
    } catch (error) {
        console.error('Failed to cancel reminder:', error)
    }
} 