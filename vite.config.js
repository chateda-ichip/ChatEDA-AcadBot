import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import yaml from '@rollup/plugin-yaml';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
// Creating a Firefox add-on package
function createFirefoxPackage() {
    return {
        name: 'create-firefox-package',
        closeBundle: function () {
            var output = fs.createWriteStream(path.resolve(__dirname, 'dist/chateda-firefox.zip'));
            var archive = archiver('zip', {
                zlib: { level: 9 }
            });
            output.on('close', function () {
                console.log('Firefox package created successfully');
            });
            archive.on('error', function (err) {
                throw err;
            });
            archive.pipe(output);
            archive.directory('dist', false);
            archive.finalize();
        }
    };
}
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
                    src: 'public/manifest.json',
                    dest: ''
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
        }),
        createFirefoxPackage()
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'index.html')
            },
            output: {
                entryFileNames: "assets/[name].js",
                chunkFileNames: "assets/[name].js",
                assetFileNames: "assets/[name].[ext]"
            }
        },
        // Support multiple browsers
        target: ['chrome89', 'edge89', 'firefox109'],
        sourcemap: true,
        // Ensures that compatible code is generated
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: false,
                drop_debugger: true
            }
        }
    }
});
