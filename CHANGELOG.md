# Changelog

本文件记录 `pjkui/yii2-markdown` 的显著变更，格式参考 [Keep a Changelog](https://keepachangelog.com/)，版本号遵循 [Semantic Versioning](https://semver.org/)。

## [1.6.0] - 2026-04-30

> 主题：**双引擎切换 UI 全面优化、Bug 修复、测试覆盖率提升**
> 涵盖 v1.5.0 → v1.5.6 的所有变更

### Added

- **单一演示页面**：`examples/index.php` 整合原 `examples/dual-engine-demo.php`，切换完全由前端处理，无需后端参数（`?engine=`）。
- **工具栏内置切换按钮**：
  - Cherry Markdown 工具栏末尾注入蓝色 **V** 徽章按钮（切换到 Vditor 所见即所得）
  - Vditor 工具栏末尾通过原生 `toolbar click` 配置蓝色 **M** 徽章按钮（切换到 Markdown），不受 Vditor 事件委托拦截
  - 徽章样式：20×20px 圆角矩形、白色粗体字母、hover 缩放动画，深色模式自动适配
- **Demo 深色模式**：导航栏右侧增加 🌙/☀️ 切换胶囊按钮，全局深色样式覆盖页面背景/容器/输入框，偏好持久化到 `localStorage`。
- **新增 E2E 测试**：
  - `E6b`：验证 Vditor 切换按钮在 `vditor-toolbar` 内且可触发确认对话框
  - `T7b`：验证 Vditor → Cherry 完整点击切换流程（内容保留）
- **新增单元测试** `converter-edge.test.js`（16 tests）：覆盖 converter.js 所有错误路径
- **Playwright 切换为 msedge**：`playwright.config.js` 改用 `msedge`，更贴近用户环境

### Changed

- `dual-engine-controller.js`：移除额外的顶部 `yii2md-toolbar-extra` 条，切换按钮统一内嵌到编辑器工具栏
- `ConverterAsset`：加入 `dual-engine-controller.js`，随 Converter 资源一并发布，无需手动注册
- `Editor.php`：Cherry 注入的切换按钮加 `data-yii2md-action="switch"` 属性，方便测试和 DualEngine 识别
- E2E 所有 Vditor 等待超时统一调整为 `20_000ms`，减少 flaky

### Fixed

- **ECharts 报错**（`table-echarts-plugin[init]: Package echarts not found`）：
  - `Cherry.usePlugin(EChartsTableEngine)` 全局执行会强制设置 `enableChart: true`，`rerenderAs` 重建 Cherry 时未传该配置导致崩溃
  - 修复：`rerenderAs` 的 `new Cherry()` 中显式设置 `engine.syntax.table.enableChart: false`
- **Vditor 切换按钮事件被拦截**：Vditor 工具栏使用事件委托，通过 DOM 注入的按钮 click 被拦截。改为使用 Vditor 原生 `toolbar` 配置方式，由 Vditor 内部管理点击事件
- **Vditor 实例 ID 不匹配**：`VditorEditor.php` 的 `switchToCherry` 按钮原本写死 PHP instanceId，而 DualEngine 注册的是根容器 `data-instance-id`。修复：从 DOM 根容器动态读取 `data-instance-id`
- **`customWysiwygToolbar is not a function`**：Vditor WYSIWYG 悬浮工具栏触发时调用了未定义的 `customWysiwygToolbar`。修复：在 `VditorEditor.php` 和 `dual-engine-controller.js` 的 `new Vditor()` 中加入空函数占位
- **`dual-engine-controller.js` 中 `DualEngine` 变量引用错误**：`injectSwitchBtn` 使用了未定义的 `DualEngine`，改为 `api`

### Test Coverage

`converter.js` 单元测试覆盖率大幅提升：

| 指标 | v1.4.0 | v1.6.0 |
|------|--------|--------|
| Statements | 63% | **93%** |
| Branches | 69% | **87%** |
| Functions | 71% | **100%** |
| Lines | 68% | **98%** |

**完整测试矩阵**：PHPUnit 18 + Jest 34 + Playwright 26 = **78 tests，全部通过**

---

## [1.4.0] - 2026-04-27

（见 git 历史）

## [1.3.0] - Unreleased

> 主题：**双引擎（Cherry Markdown + Vditor），可在 Markdown 与所见即所得之间无缝切换**
> 关联 issue：[#1](https://github.com/pjkui/yii2-markdown/issues/1)、[#3](https://github.com/pjkui/yii2-markdown/issues/3)、[#4](https://github.com/pjkui/yii2-markdown/issues/4)、[#5](https://github.com/pjkui/yii2-markdown/issues/5)、[#6](https://github.com/pjkui/yii2-markdown/issues/6)、[#7](https://github.com/pjkui/yii2-markdown/issues/7)、[#8](https://github.com/pjkui/yii2-markdown/issues/8)

### Added
- **Vditor 引擎**：`pjkui\markdown\VditorEditor`、`VditorAsset`、`src/dist/vditor/*`
- **统一入口** `Editor` 顶层新增 `isMarkdown` 选项，按值路由到 Cherry / Vditor 两套实现
- **互转 API**：`window.Yii2Markdown.Convert.{mdToHtml, htmlToMd}`，基于 marked + Turndown
- **模式切换控制器** `src/dist/dual-engine-controller.js`：
  - `window.Yii2Markdown.DualEngine.{init, switchTo, revert}`
  - 切换前确认对话框（纯 CSS）
  - 内存快照 `__lastSnapshot`，转换后顶部黄色横幅 + 「放弃转换」按钮
  - 自定义事件 `yii2md:beforeSwitch / afterSwitch / revert`
- **双 hidden 字段**：表单同时输出 `{name}_md` / `{name}_html`，按需持久化
- **演示 Demo** `examples/dual-engine-demo.php`（仅本机 + DEMO 守卫）
- **文档**：新增 `docs/migration-guide.md`，更新 `docs/usage.md §7`、`docs/configuration.md` 双引擎章节
- **E2E 测试**：`tests/e2e/switch-mode.spec.js`（T1–T9）、`tests/e2e/dual-engine.spec.js`（E1–E7）

### Changed
- `Editor::widget` 默认行为不变，未传 `isMarkdown` 时与 v1.2.x 完全等价
- 资源发布白名单（`EditorAsset` / `VditorAsset`）补全，覆盖 `vditor/` 子目录

### Migration
- 升级即可使用，无破坏性改动；新字段 `_md` / `_html` 按需在后端 `rules()` 接受
- 详见 [docs/migration-guide.md](./docs/migration-guide.md)

## [1.2.0] - 2026-04-20

### Added
- **可视化 Demo**：新增 `examples/` 目录，提供本机可视化验证 Editor/Preview 的最小环境。
  - `composer demo` 一键启动：`http://127.0.0.1:8080/`
  - 附带模拟上传接口 `/upload.php`、Preview 预览页、提交回显等
- **PHPUnit 测试**：新增 `tests/` 目录与 `phpunit.xml.dist` 配置，`composer test` 一键运行。
  - 覆盖 `Editor` 的模型绑定、容器渲染、脚本/样式注册、非法 `tagType` 处理
  - 覆盖 `Preview` 的只读预览容器与 `previewOnly` 配置
- **Demo 安全守卫** `examples/_guard.php`：三重校验（CLI Server + 环境变量 + 回环来源），防止误部署造成任意文件上传风险。
- **分发排除** `.gitattributes` + `composer.json` 的 `archive.exclude`：`examples/`、`tests/`、`docs/` 等不进入使用方的 `vendor/`。
- **文档**：新增 `docs/testing.md`、`examples/README.md`、`CHANGELOG.md`。

### Changed
- **JS 注入位置**：`Editor` 与 `Preview` 的客户端脚本由默认的 `View::POS_READY` 改为 `View::POS_END`。
- **EditorAsset `publishOptions.only`**：补全根目录 `dist/*.js` / `dist/*.css` 的匹配。

### Fixed
- 修复 `src/Preview.php` 中 PHP 8.2+ 已废弃的 `${var}` 字符串插值语法。

### Security
- **Demo 上传接口加固**：扩展名白名单 + `finfo` 真实 MIME 双重校验，完全丢弃用户原始文件名，5 MB 上限。

## [1.1.0] - 之前版本

见 git 历史。
