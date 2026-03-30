import path from 'path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['src/test/e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/components/ui/**',   // shadcn generado — no testear
        'src/test/**',
        'src/main.tsx',
        'src/router.tsx',
        'src/**/*.d.ts',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
      reporter: ['text', 'html', 'lcov'],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
