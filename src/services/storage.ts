import { ref } from 'vue'

export interface ConferenceSubscription {
    id: string
    title: string
    year: number
    deadline: string
    date: string
    place?: string // Make place optional
}

// Storage path
const storagePath = ref<string>('')

// Load storage path from chrome.storage
export const loadStoragePath = async () => {
    const result = await chrome.storage.sync.get(['storagePath'])
    storagePath.value = result.storagePath || ''
    return storagePath.value
}

// Save storage path
export const saveStoragePath = async (path: string) => {
    await chrome.storage.sync.set({ storagePath: path })
    storagePath.value = path
}

// Save subscribed meetings
export const saveSubscriptions = async (subscriptions: ConferenceSubscription[]) => {
    await chrome.storage.sync.set({
        subscriptions,
        lastUpdated: new Date().toISOString()
    })
}

// Load subscribed meetings
export const loadSubscriptions = async (): Promise<ConferenceSubscription[]> => {
    try {
        const result = await chrome.storage.sync.get(['subscriptions'])
        return result.subscriptions || []
    } catch (error) {
        console.error('Failed to load subscription information:', error)
        return []
    }
}

// Add Subscription
export const addSubscription = async (subscription: ConferenceSubscription): Promise<void> => {
    try {
        const subscriptions = await loadSubscriptions()
        const existingIndex = subscriptions.findIndex(sub => sub.id === subscription.id)

        if (existingIndex === -1) {
            subscriptions.push(subscription)
        } else {
            subscriptions[existingIndex] = subscription
        }

        await chrome.storage.sync.set({ subscriptions })
    } catch (error) {
        console.error('Failed to add subscription:', error)
        throw error
    }
}

// Remove Subscription
export const removeSubscription = async (subscriptionId: string): Promise<void> => {
    try {
        const subscriptions = await loadSubscriptions()
        const updatedSubscriptions = subscriptions.filter(sub => sub.id !== subscriptionId)
        await chrome.storage.sync.set({ subscriptions: updatedSubscriptions })
    } catch (error) {
        console.error('Failed to remove subscription:', error)
        throw error
    }
}

// Check if you are subscribed
export const isSubscribed = async (subscriptionId: string): Promise<boolean> => {
    try {
        const subscriptions = await loadSubscriptions()
        return subscriptions.some(sub => sub.id === subscriptionId)
    } catch (error) {
        console.error('Checking subscription status failed:', error)
        return false
    }
}

// Get the last updated time
export const getLastUpdated = async (): Promise<string | null> => {
    const result = await chrome.storage.sync.get(['lastUpdated'])
    return result.lastUpdated || null
} 