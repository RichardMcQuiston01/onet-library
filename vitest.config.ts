import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    environmentMatchGlobs: [
      ['src/hooks/**/*.test.tsx', 'happy-dom'],
      ['src/components/**/*.test.tsx', 'happy-dom'],
    ],
    pool: 'forks',
  },
})
