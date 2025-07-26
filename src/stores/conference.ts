import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface SubscribedConference {
    id: string
    title: string
    year: number
    date: string
    place: string
    deadline: string
    abstractDeadline?: string
    link?: string
    timezone?: string
}

export const useConferenceStore = defineStore('conference', () => {
    const subscribedConferences = ref<SubscribedConference[]>([])

    // Check if the conference is subscribed
    const isSubscribed = (confId: string) => {
        return subscribedConferences.value.some(conf => conf.id === confId)
    }

    // Subscribe to Conference
    const subscribeConference = async (conference: SubscribedConference) => {
        if (!isSubscribed(conference.id)) {
            subscribedConferences.value.push(conference)
            // Here you can add synchronization logic with the backend
        }
    }

    // Unsubscribe from a conference
    const unsubscribeConference = async (confId: string) => {
        subscribedConferences.value = subscribedConferences.value.filter(
            conf => conf.id !== confId
        )
        // Here you can add synchronization logic with the backend
    }

    // Get all subscribed meetings
    const getSubscribedConferences = () => {
        return subscribedConferences.value
    }

    return {
        subscribedConferences,
        isSubscribed,
        subscribeConference,
        unsubscribeConference,
        getSubscribedConferences
    }
}) 