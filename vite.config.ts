import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
    coverage: {
      thresholds: {
        statements: 80,
        lines: 80,
        functions: 75,
        branches: 60,
      },
    },
  },
})
