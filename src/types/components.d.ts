import { DefineComponent } from 'vue'

declare module '@/components/DebugPanel' {
    const DebugPanel: DefineComponent<{}, {}, any>
    export default DebugPanel
}

// Declaring global component types
declare module 'vue' {
    export interface GlobalComponents {
        DebugPanel: DefineComponent<{}, {}, any>
    }
} 