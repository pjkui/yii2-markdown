# Issue #8 测试基础设施 + 回归矩阵 验收报告

**日期**: 2026-04-26
**结论**: ⚠️ 基础设施全绿；E2E 切换链路存在源码 bug，已反馈给 backend-dev / frontend-dev

## 跑动统计

| 套件 | 文件 | 用例数 | 通过 | 失败 |
|------|------|--------|------|------|
| PHPUnit | tests/EditorTest.php、tests/PreviewTest.php、tests/unit/{VditorAssetTest,EditorRoutingTest,VditorEditorTest}.php | 18 | 18 | 0 |
| Jest | tests/unit/smoke.test.js、tests/unit/converter/converter.test.js | 18 | 18 | 0 |
| Playwright (chromium, regression.spec.js) | R1, R5, R6×2 | 4 | 4 | 0 |
| Playwright (chromium, regression.spec.js) | R2, R3, R4 | 3 | 0 | 3（依赖切换链路 bug） |
| Playwright (chromium, switch-mode.spec.js, frontend-dev) | T1–T9 | 9 | 5 | 4（T5/T6/T7/T8） |
| Playwright (chromium, dual-engine.spec.js, frontend-dev) | E1–E7 | 7 | 6 | 1（E3） |

**合计**：PHP 18/18 ✓、JS 18/18 ✓、E2E 19/27 ✓（chromium 单浏览器；firefox 因网络无法下载）。

## 基础设施清单

| # | 项目 | 状态 | 证据 |
|---|------|------|------|
| 1 | `phpunit.xml.dist` 加 unit / integration suite | ✅ | `vendor/bin/phpunit --testsuite unit` 跑 18，`--testsuite integration` 跑 0 |
| 2 | `package.json` 声明 jest / @playwright/test / turndown / turndown-plugin-gfm / marked / vditor | ✅ | `npm install` 339 packages OK |
| 3 | `jest.config.js`（jsdom + tests/unit/**/*.test.js） | ✅ | `npm test` 18/18 |
| 4 | `playwright.config.js`（baseURL + webServer） | ✅ | `npx playwright test --list` 显示 48 tests |
| 5 | `tests/run-server.sh` | ✅ | 起 `php -S localhost:8080 -t examples examples/router.php`（绝对路径） |
| 6 | `package.json` scripts: test / test:e2e / test:php / test:all | ✅ | 见 package.json |
| 7 | README 增加「测试」章节 | ✅ | README 末尾「测试」章节 |
| 8 | 回归矩阵 R1–R6 | ⚠️ | 写在 tests/e2e/regression.spec.js；R2/R3/R4 受切换 bug 影响失败 |

## 关键发现：DualEngine 切换 → Vditor 的实现 bug

E2E 的 5 个失败用例（T5/T6/T7/T8/E3 + 我的 R2/R3/R4）共享同一个 root cause：

> 点击「切换到所见即所得」并确认对话框后，`.yii2-markdown-root[data-engine]` 仍停留在 `cherry`，从未变成 `vditor`；`window.vditor_<id>` 也没出现。Cherry 实例容器与工具条都正常渲染，确认对话框也正常弹出，但是 confirm 之后没有真正激活 Vditor。

可能原因（待 backend-dev / frontend-dev 排查）：
1. `dual-engine-controller.js` 在 confirm 回调里没调 `VditorEditor` 的初始化
2. Vditor 资源 (`VditorAsset`) 在 `dual-engine-demo.php` 路由下没注册
3. `htmlToMarkdown` / `markdownToHtml` 异步初始化未 resolve

请优先复现并修复，修复后重跑：
```bash
npx playwright test --project=chromium tests/e2e/regression.spec.js tests/e2e/switch-mode.spec.js tests/e2e/dual-engine.spec.js
```

## 浏览器与系统依赖

- Chromium 通过 `npx playwright install chromium` + `sudo npx playwright install-deps chromium` 完成（沙箱里需要 sudo 装 libnspr4/libnss3/libgbm1 等）
- Firefox 在本沙箱网络下未能下完，CI 与本地需各自执行 `npx playwright install`
- 已通过 `channel: 'chromium'` 让 Playwright 使用完整 Chrome 而非 chromium-headless-shell（本沙箱下 headless-shell 下载稳定性差）

## 交付物
- 新文件：`package.json` / `jest.config.js` / `playwright.config.js` / `tests/run-server.sh` / `tests/unit/smoke.test.js` / `tests/e2e/regression.spec.js` / `tests/e2e/regression.spec.js-snapshots/*.png` / `tests/unit/.gitkeep` / `tests/integration/.gitkeep` / `docs/tests/issue-8-VERIFY.md`
- 修改文件：`phpunit.xml.dist` / `tests/bootstrap.php` / `README.md` / `.gitignore`
- 未触碰 `src/` 下任何 PHP / JS 源码
