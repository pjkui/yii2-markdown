# Changelog

本文件记录 `pjkui/yii2-markdown` 的显著变更，格式参考 [Keep a Changelog](https://keepachangelog.com/)，版本号遵循 [Semantic Versioning](https://semver.org/)。

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
  - 原因：`POS_READY` 会隐式把代码包装在 `jQuery(function($){...})` 里，导致使用方必须引入 jQuery，否则 `jQuery is not defined`。
  - 组件自身的初始化脚本均以 IIFE 包装，`POS_END` 时 DOM 已就绪，**彻底消除 jQuery 依赖**。
- **EditorAsset `publishOptions.only`**：由 `['*/*.js', '*/*.css', 'addons/*', 'fonts/*']` 调整为 `['*.js', '*.css', '*/*.js', '*/*.css', 'addons/*', 'fonts/*']`。
  - 补全根目录 `dist/*.js` / `dist/*.css` 的匹配，此前 **`cherry-markdown.js/css/upload-file.js` 会被 AssetManager 过滤掉**，导致所有使用方首次发布资源后出现 404 和编辑器加载失败。

### Fixed
- 修复 `src/Preview.php` 中 PHP 8.2+ 已废弃的 `${var}` 字符串插值语法，改为 `{$var}`。

### Security
- **Demo 上传接口加固**：
  - 仅允许 `POST`、`REMOTE_ADDR` 为回环地址
  - 扩展名白名单 + `finfo` 真实 MIME 双重校验（防 `.png` 藏 `<?php>` 等扩展名伪装攻击）
  - 完全丢弃用户原始文件名，使用 `时间戳_随机串.白扩展名` 重命名
  - 5 MB 大小上限，`X-Content-Type-Options: nosniff`、`X-Robots-Tag: noindex`
- `examples/uploads/.htaccess`：在误部署到 Apache 时禁止执行 `.php/.phtml/.phar/.py/.sh/.cgi` 等脚本，关闭目录索引。

### Internal
- `yidas/yii2-bower-asset` 移动到 `require-dev`，仅本地开发/测试使用，不强制终端用户。
- `composer.json` 新增 `allow-plugins.yiisoft/yii2-composer`。
- `.gitignore` 新增 `composer.lock`、`.phpunit.result.cache`、`examples/assets/`、`examples/uploads/*`（保留防护文件）。

## [1.1.0] - 之前版本

见 git 历史。
