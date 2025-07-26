import { ref } from 'vue'

export interface ConferenceSubscription {
    id: string
    title: string
    year: number
    deadline: string
    date: string
    place?: string // 将 place 设为可选
}

// 存储路径
const storagePath = ref<string>('')

// 从 chrome.storage 加载存储路径
export const loadStoragePath = async () => {
    const result = await chrome.storage.sync.get(['storagePath'])
    storagePath.value = result.storagePath || ''
    return storagePath.value
}

// 保存存储路径
export const saveStoragePath = async (path: string) => {
    await chrome.storage.sync.set({ storagePath: path })
    storagePath.value = path
}

// 保存订阅的会议
export const saveSubscriptions = async (subscriptions: ConferenceSubscription[]) => {
    await chrome.storage.sync.set({
        subscriptions,
        lastUpdated: new Date().toISOString()
    })
}

// 加载订阅的会议
export const loadSubscriptions = async (): Promise<ConferenceSubscription[]> => {
    try {
        const result = await chrome.storage.sync.get(['subscriptions'])
        return result.subscriptions || []
    } catch (error) {
        console.error('加载订阅信息失败:', error)
        return []
    }
}

// 添加订阅
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
        console.error('添加订阅失败:', error)
        throw error
    }
}

// 移除订阅
export const removeSubscription = async (subscriptionId: string): Promise<void> => {
    try {
        const subscriptions = await loadSubscriptions()
        const updatedSubscriptions = subscriptions.filter(sub => sub.id !== subscriptionId)
        await chrome.storage.sync.set({ subscriptions: updatedSubscriptions })
    } catch (error) {
        console.error('移除订阅失败:', error)
        throw error
    }
}

// 检查是否已订阅
export const isSubscribed = async (subscriptionId: string): Promise<boolean> => {
    try {
        const subscriptions = await loadSubscriptions()
        return subscriptions.some(sub => sub.id === subscriptionId)
    } catch (error) {
        console.error('检查订阅状态失败:', error)
        return false
    }
}

// 获取最后更新时间
export const getLastUpdated = async (): Promise<string | null> => {
    const result = await chrome.storage.sync.get(['lastUpdated'])
    return result.lastUpdated || null
} 