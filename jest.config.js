/**
 * Jest 配置：运行 tests/unit/**\/*.test.js 下的前端单元测试（主要是 Markdown ↔ HTML 互转）。
 */
module.exports = {
  testEnvironment: 'jsdom',
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.js',
  ],
  moduleDirectories: ['node_modules'],
  transform: {},
  verbose: true,
  // E2E 测试由 Playwright 负责，避免 Jest 去跑。
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/e2e/',
    '/vendor/',
  ],
};
