import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite"
import dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.resolve(__dirname, "../.env"), silent: true })

const BACKEND_TARGET = process.env.VITE_BACKEND_URL || "http://127.0.0.1:4000"

export default defineConfig({
  envDir: "../",
  server: {
    host: "127.0.0.1",
    proxy: {
      "/api": {
        target: BACKEND_TARGET,
        changeOrigin: true,
        secure: false,
        ws: true,
        timeout: 60000,
      },
    },
  },
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-stream': ['@stream-io/video-react-sdk', '@stream-io/video-client', 'stream-chat', 'stream-chat-react'],
          'vendor-clerk': ['@clerk/clerk-react'],
          'vendor-editor': ['@monaco-editor/react'],
          'vendor-ui': ['framer-motion', 'lucide-react', 'react-hot-toast'],
        },
      },
    },
  },
})
