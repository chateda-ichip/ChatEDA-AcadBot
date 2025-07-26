export interface Timeline {
    abstract_deadline: string
    deadline: string
}

export interface Conference {
    year: number
    id: string
    link: string
    timeline: Timeline[]
    timezone: string
    date: string
    place: string
}

export interface ConferenceInfo {
    title: string
    description: string
    sub: string
    rank: {
        ccf: string
        core: string
        thcpl: string
    }
    dblp: string
    confs: Conference[]
} 