import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(() => {
  const buildLib = process.env.BUILD_LIB === 'true'
  return {
    plugins: [vue(), vueDevTools()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: buildLib
      ? {
          lib: {
            entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
            name: 'VirtualTree',
            fileName: (format) => `virtual-tree.${format}.js`,
            formats: ['es', 'cjs', 'umd'],
          },
          rollupOptions: {
            external: ['vue'],
            output: {
              globals: { vue: 'Vue' },
            },
          },
        }
      : undefined,
  }
})
