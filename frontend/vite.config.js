import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  envDir: "../",
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
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
