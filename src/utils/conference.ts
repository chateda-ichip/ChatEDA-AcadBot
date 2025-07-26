import * as yamlLib from 'js-yaml'
const yaml = yamlLib as any


export interface ConferenceYear {
    year: number
    id?: string
    date: string
    place: string
    abstractDeadline: string
    deadline: string
    link?: string
    timezone?: string
}

export interface Conference {
    id?: string
    title: string
    description: string
    sub?: string
    rank?: string
    dblp?: string
    years: ConferenceYear[]
}

// Remote GitHub repository configuration
const REPO_CONFIG = {
    owner: 'chateda-ichip',
    repo: 'ConfTrack',
    branch: 'main',
    path: 'conference'
}

// Loading conference data from a remote GitHub repository
export async function loadConferences(): Promise<Conference[]> {
    const conferences: Conference[] = []
    const categories = ['arch', 'design', 'device', 'eda']

    try {
        for (const category of categories) {
            try {
                // First get the directory listing
                const response = await fetch(
                    `https://api.github.com/repos/${REPO_CONFIG.owner}/${REPO_CONFIG.repo}/contents/${REPO_CONFIG.path}/${category}?ref=${REPO_CONFIG.branch}`
                )

                if (!response.ok) {
                    throw new Error(`GitHub API Response Error: ${response.status} ${response.statusText}`)
                }

                const files = await response.json()
                console.log(`Loading files in the ${category} directory:`, files)

                // Iterate over YAML files in a directory
                for (const file of files) {
                    if (file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
                        try {
                            const contentResponse = await fetch(file.download_url)
                            if (!contentResponse.ok) {
                                throw new Error(`Failed to download the file: ${contentResponse.status} ${contentResponse.statusText}`)
                            }

                            const yamlContent = await contentResponse.text()
                            console.log(`Parsing the file ${file.name}:`, yamlContent)

                            const conferenceData = yaml.load(yamlContent) as any[]

                            if (Array.isArray(conferenceData)) {
                                for (const confData of conferenceData) {
                                    if (confData && typeof confData === 'object' && 'title' in confData && 'description' in confData) {
                                        // Convert data formats
                                        const conf: Conference = {
                                            title: confData.title,
                                            description: confData.description,
                                            sub: confData.sub || {
                                                'arch': 'Computer Architecture',
                                                'design': 'Circuit Design',
                                                'device': 'Device',
                                                'eda': 'EDA'
                                            }[category] || category,
                                            rank: confData.rank,
                                            dblp: confData.dblp,
                                            years: []
                                        }

                                        // Processing conference year data
                                        if (confData.confs && Array.isArray(confData.confs)) {
                                            conf.years = confData.confs.map((year: any) => ({
                                                year: year.year,
                                                id: year.id,
                                                date: year.date,
                                                place: year.place,
                                                abstractDeadline: year.abstract_deadline,
                                                deadline: year.deadline,
                                                link: year.link,
                                                timezone: year.timezone
                                            }))
                                        }

                                        console.log(`Successfully resolved the meeting: ${conf.title}`, conf)
                                        conferences.push(conf)
                                    }
                                }
                            }
                        } catch (error) {
                            console.error(`Failed to parse remote file ${file.name}:`, error)
                        }
                    }
                }
            } catch (error) {
                console.error(`Failed to get directory ${category}:`, error)
            }
        }
    } catch (error) {
        console.error('Failed to load meeting data from GitHub:', error)
    }

    console.log('Final loaded conference data:', conferences)
    return conferences
}

// Cache related
const CACHE_KEY = 'conference_data_cache'
const CACHE_EXPIRY = 1000 * 60 * 60 // 1 hour

interface CacheData {
    conferences: Conference[]
    timestamp: number
}

// Loading data from cache
export async function loadFromCache(): Promise<Conference[] | null> {
    try {
        const result = await chrome.storage.local.get([CACHE_KEY])
        const cache = result[CACHE_KEY] as CacheData | undefined

        if (cache && Date.now() - cache.timestamp < CACHE_EXPIRY) {
            console.log('Loading data from cache:', cache.conferences)
            return cache.conferences
        }
    } catch (error) {
        console.error('Failed to read cache:', error)
    }
    return null
}

// Save data to cache
export async function saveToCache(conferences: Conference[]): Promise<void> {
    try {
        await chrome.storage.local.set({
            [CACHE_KEY]: {
                conferences,
                timestamp: Date.now()
            }
        })
        console.log('Save data to cache:', conferences)
    } catch (error) {
        console.error('Failed to save cache:', error)
    }
}

// Check if the date is in the past
export function isDateInPast(dateString: string): boolean {
    if (!dateString) return false;
    const date = new Date(dateString);
    const now = new Date();
    return date < now;
}

// Preloading Data
export async function preloadConferences(): Promise<Conference[]> {
    // Try loading from cache first
    const cached = await loadFromCache()
    if (cached) {
        return cached
    }

    // If there is no cache or the cache is expired, load from remote
    const conferences = await loadConferences()

    // Save to Cache
    await saveToCache(conferences)

    return conferences
} 