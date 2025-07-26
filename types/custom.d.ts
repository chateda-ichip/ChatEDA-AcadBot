/// <reference types="vite/client" />
/// <reference types="vue/jsx" />

declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<{}, {}, any>
    export default component
}

declare module '*.yaml' {
    const value: any
    export default value
}

declare module '*.yaml?raw' {
    const content: string
    export default content
}

declare module '*.yml' {
    const value: any
    export default value
}

declare module '*.yml?raw' {
    const content: string
    export default content
}

declare module '*.json' {
    const value: any
    export default value
}

declare module '*.module.css' {
    const styles: { readonly [key: string]: string }
    export default styles
}

declare namespace chrome {
    namespace runtime {
        function getURL(path: string): string
        function sendMessage(message: any): void
    }
    namespace tabs {
        function query(queryInfo: any, callback: (tabs: any[]) => void): void
    }
}

// Supplement Element Plus related type declarations
declare module 'element-plus/es/virtual-tree' {
    export enum TreeOptionsEnum {
        CHILDREN = 'children',
        LABEL = 'label',
        DISABLED = 'disabled',
        KEY = 'value',
        CLASS = 'class'
    }
}

// Add JSX namespace
declare namespace JSX {
    interface Element extends VNode { }
    interface ElementClass extends ComponentRenderProxy { }
    interface IntrinsicElements {
        [elem: string]: any
    }
}

// Defining the ConferenceInfo Type
interface ConferenceYear {
    year: number
    id?: string
    date: string
    place: string
    abstractDeadline?: string
    deadline: string
    link?: string
    timezone?: string
}

interface ConferenceInfo {
    title: string
    description: string
    sub?: string
    rank: string
    dblp?: string
    years: ConferenceYear[]
}

// Supplement Vue related types
declare module 'vue' {
    export interface GlobalComponents {
        ElButton: typeof import('element-plus')['ElButton']
        ElInput: typeof import('element-plus')['ElInput']
        // ... Other Element Plus Components
    }

    export type FunctionalComponent<P = {}> = {
        (props: P, ctx: any): any
        props?: any
        emits?: any[]
        slots?: any
    }

    export interface ComponentOptions {
        name?: string;
        props?: Record<string, any>;
        setup?: (props: any, ctx: any) => any;
    }

    export const defineComponent: <T extends ComponentOptions>(options: T) => T;

    export const ref: <T>(value: T) => Ref<T>
    export const computed: <T>(getter: () => T) => ComputedRef<T>
    export const onMounted: (fn: () => void) => void
    export const watch: (source: any, cb: any, options?: any) => void
    export const h: any

    export type PropType<T> = { new(): T } | { (): T } | { new(...args: any[]): T } | { (...args: any[]): T }

    export interface Ref<T = any> {
        value: T
    }

    export interface ComputedRef<T = any> extends Ref<T> {
        readonly value: T
    }

    export interface App {
        use(plugin: any): App
        mount(rootContainer: string | Element): void
    }

    export function createApp(rootComponent: any): App
} 