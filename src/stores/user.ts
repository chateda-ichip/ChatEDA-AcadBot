import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
    const userId = ref<string | null>(null)
    const username = ref<string | null>(null)
    const preferences = ref<Record<string, any>>({})

    const setUser = (id: string, name: string) => {
        userId.value = id
        username.value = name
    }

    const clearUser = () => {
        userId.value = null
        username.value = null
        preferences.value = {}
    }

    const updatePreferences = (newPrefs: Record<string, any>) => {
        preferences.value = { ...preferences.value, ...newPrefs }
    }

    return {
        userId,
        username,
        preferences,
        setUser,
        clearUser,
        updatePreferences
    }
}) 