import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, 'index.html'),
        background: path.resolve(__dirname, 'src_background/background.js'),
        // content: path.resolve(__dirname, 'src_content/content.js'),
      },
      output: {
        entryFileNames: '[name].js',
      }
    },
    outDir: 'dist',
    emptyOutDir: true,
  }
})