import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import yaml from '@rollup/plugin-yaml'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        vueJsx({
            include: [/\.[jt]sx$/]
        }),
        yaml({
            include: ['**/*.yml', '**/*.yaml']
        }),
        viteStaticCopy({
            targets: [
                {
                    src: 'public/manifest.firefox.json',
                    dest: '',
                    rename: 'manifest.json'
                },
                {
                    src: 'public/icons',
                    dest: ''
                },
                {
                    src: 'public/background.js',
                    dest: ''
                }
            ]
        })
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    },
    build: {
        outDir: 'dist-firefox',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'index.html')
            },
            output: {
                entryFileNames: `assets/[name].js`,
                chunkFileNames: `assets/[name].js`,
                assetFileNames: `assets/[name].[ext]`
            }
        },
        // Firefox specific configuration
        target: 'firefox57',
        sourcemap: true,
        minify: false // Firefox development mode does not compress, which is convenient for debugging
    }
}) 