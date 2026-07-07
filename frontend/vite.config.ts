import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './app'),
      '@components': path.resolve(__dirname, './app/components'),
      '@hooks': path.resolve(__dirname, './app/hooks'),
      '@stores': path.resolve(__dirname, './app/stores'),
      '@models': path.resolve(__dirname, './app/models'),
      '@pages': path.resolve(__dirname, './app/pages'),
      '@routes': path.resolve(__dirname, './app/routes'),
    },
  },
})
