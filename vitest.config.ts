import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  // The suite was all plain .ts until now, so JSX compiled with the classic runtime
  // and the first component test failed on "React is not defined". 'automatic'
  // matches what Next.js already uses, so a component renders under test the same way
  // it does in the app, without every file importing React to satisfy the transform.
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})