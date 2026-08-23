import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
export default defineConfig({
  base: '/Space-Droper/',
  plugins: [
    react(),
    basicSsl(), // generates a self-signed cert so WebXR (HTTPS-only) works over LAN
  ],
  server: {
    https: true,
    host: true,   // bind to 0.0.0.0 so the phone can reach the dev server over Wi-Fi
    port: 5173,
  },
  preview: {
    https: true,
    host: true,
  },
})