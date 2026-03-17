import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Your existing React aliases
      react: path.resolve('./node_modules/react'),
      'react-dom': path.resolve('./node_modules/react-dom'),
      
      // THE FIREBASE FIX: Redirects the base 'firebase' import to the 'app' module
      firebase: 'firebase/app',
    },
  },
  // This pre-bundles these dependencies so Vite doesn't trip over them during build
  optimizeDeps: {
    include: ['firebase/app', 'firebase/auth']
  }
})