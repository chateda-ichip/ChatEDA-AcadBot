import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        name: 'conferences',
        component: () => import('../views/Conferences')
    },
    {
        path: '/submissions',
        name: 'submissions',
        component: () => import('../views/Submissions')
    },
    {
        path: '/yaml-conferences',
        name: 'yaml-conferences',
        component: () => import('../views/YamlConferences')
    }
]

const router = createRouter({
    history: createWebHashHistory(),
    routes
})

export default router 