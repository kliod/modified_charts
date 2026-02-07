import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
// BASE_URL задаётся в GitHub Actions для деплоя на Pages (например /repo-name/)
export default defineConfig({
  base: process.env.BASE_URL || '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@internal/chart-dsl': path.resolve(__dirname, './chart-dsl/src/index'),
      '@internal/chart-dsl/react': path.resolve(__dirname, './chart-dsl/src/react/index')
    }
  }
})
