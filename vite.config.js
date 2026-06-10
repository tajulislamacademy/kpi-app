import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // Split heavy third-party libs into their own cached chunks so no single
    // file is huge (and the warning goes away). App code stays in the entry.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('xlsx')) return 'xlsx'
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('react-day-picker') || id.includes('date-fns')) return 'datepicker'
          if (id.includes('radix-ui') || id.includes('@radix-ui') || id.includes('cmdk')) return 'radix'
          if (id.includes('react') || id.includes('scheduler')) return 'react'
          return 'vendor'
        },
      },
    },
  },
  test: {
    environment: 'node',
    // Dummy Supabase env so modules that import the client (which throws when
    // env is missing) can load during unit tests of pure logic.
    env: {
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
})
