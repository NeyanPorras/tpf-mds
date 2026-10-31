import { defineConfig } from '@playwright/test'

// Los tests corren contra el dev server de Vite (5173) y la API (8000).
// Se necesita: uvicorn levantado, MySQL con el schema+seed y `npm run dev`.
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: {
    timeout: 7000,
  },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30000,
  },
})
