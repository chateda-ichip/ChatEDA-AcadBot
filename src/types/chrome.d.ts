declare namespace chrome {
    export interface StorageArea {
        get(keys?: string | string[] | Object | null): Promise<{ [key: string]: any }>
        set(items: Object): Promise<void>
        remove(keys: string | string[]): Promise<void>
        clear(): Promise<void>
    }

    export interface Storage {
        sync: StorageArea
        local: StorageArea
        session: StorageArea
    }

    export interface Alarm {
        name: string
        scheduledTime: number
        periodInMinutes?: number
    }

    export interface AlarmCreateInfo {
        when?: number
        delayInMinutes?: number
        periodInMinutes?: number
    }

    export interface Alarms {
        create(name: string, alarmInfo: AlarmCreateInfo): void
        getAll(): Promise<Alarm[]>
        clear(name: string): Promise<boolean>
        onAlarm: {
            addListener(callback: (alarm: Alarm) => void): void
        }
    }

    export interface NotificationOptions {
        type: 'basic' | 'image' | 'list' | 'progress'
        iconUrl: string
        title: string
        message: string
        priority?: number
    }

    export interface Notifications {
        create(options: NotificationOptions): void
        create(notificationId: string, options: NotificationOptions): void
    }

    export interface Runtime {
        onMessage: {
            addListener(callback: (message: any, sender: any, sendResponse: (response?: any) => void) => void): void
            removeListener(callback: (message: any, sender: any, sendResponse: (response?: any) => void) => void): void
        }
        onStartup: {
            addListener(callback: () => void): void
        }
        onInstalled: {
            addListener(callback: () => void): void
        }
        sendMessage(message: any): void
        getURL(path: string): string
    }

    export const storage: Storage
    export const alarms: Alarms
    export const notifications: Notifications
    export const runtime: Runtime
} 