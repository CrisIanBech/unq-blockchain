import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Listen on 0.0.0.0 so phones on the same Wi‑Fi can reach the dev server
    host: true,
    port: 5173,
    // Vite 6 blocks unknown Host headers by default — allow LAN IP / MetaMask browser
    allowedHosts: true,
  },
  preview: {
    host: true,
    port: 5173,
    allowedHosts: true,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
      '@': path.resolve(__dirname, './app'),
      '@components': path.resolve(__dirname, './app/components'),
      '@hooks': path.resolve(__dirname, './app/hooks'),
      '@stores': path.resolve(__dirname, './app/stores'),
      '@models': path.resolve(__dirname, './app/models'),
      '@pages': path.resolve(__dirname, './app/pages'),
      '@routes': path.resolve(__dirname, './app/routes'),
    },
  },
  optimizeDeps: {
    include: ["@walletconnect/ethereum-provider", "@reown/appkit"],
  },
})
