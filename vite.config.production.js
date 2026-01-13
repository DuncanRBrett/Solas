import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Production config for single-file distribution
export default defineConfig({
  plugins: [react()],
  base: './', // Use relative paths so it works from any location
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Inline all CSS and small assets into JS
    cssCodeSplit: false,
    assetsInlineLimit: 100000000, // 100MB - inline everything
    rollupOptions: {
      output: {
        // Generate single JS file
        manualChunks: undefined,
        inlineDynamicImports: true,
        entryFileNames: 'solas.js',
        assetFileNames: 'solas.[ext]'
      }
    },
    // Optimize for size
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true
      }
    }
  }
})
