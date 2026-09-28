import { defineConfig } from '@playwright/test';
import config from './playwright.config';

export default defineConfig(config, {
  outputDir: './test-results/cold-probe',
  use: { ...config.use, baseURL: 'http://127.0.0.1:5189' },
  webServer: {
    command: 'npm run dev -- --port 5189 --strictPort',
    url: 'http://127.0.0.1:5189',
    reuseExistingServer: false,
  },
});
