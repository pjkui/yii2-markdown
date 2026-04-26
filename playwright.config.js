// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright 配置：
 * - 使用 tests/run-server.sh 启动 PHP 内置 server（examples 目录）
 * - baseURL 固定 http://localhost:8080
 * - testDir 指向 tests/e2e
 *
 * 说明：chromium project 显式声明 channel: 'chromium'，让它使用完整 Chromium
 * 而不是默认的 chrome-headless-shell（部分 CI / 沙箱环境无法稳定下载 shell）。
 */
module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chromium',
      },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
  webServer: {
    command: 'bash tests/run-server.sh',
    url: 'http://localhost:8080/',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
