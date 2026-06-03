import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      react: path.resolve('./node_modules/react'),
      'react-dom': path.resolve('./node_modules/react-dom'),
      // Map 'firebase/auth' and 'firebase/app' directly to their ESM versions
      'firebase/app': path.resolve(__dirname, 'node_modules/firebase/app/dist/index.mjs'),
      'firebase/auth': path.resolve(__dirname, 'node_modules/firebase/auth/dist/index.mjs'),
    },
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
})