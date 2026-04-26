# yii2-markdown

`yii2-markdown` 是一个基于 [Cherry Markdown](https://github.com/Tencent/cherry-markdown) 封装的 Yii2 扩展，提供：

- Markdown 编辑器组件 `pjkui\markdown\Editor`
- Markdown 只读预览组件 `pjkui\markdown\Preview`
- 已打包的前端静态资源 `EditorAsset`
- 文件上传、草稿自动保存、快捷键提交、字数统计等增强能力

## 安装

```bash
composer require pjkui/yii2-markdown
```

## 快速开始

```php
use pjkui\markdown\Editor;

echo Editor::widget([
    'model' => $model,
    'attribute' => 'content',
]);
```

## 文档

- [文档首页](./docs/README.md)
- [安装说明](./docs/installation.md)
- [使用示例](./docs/usage.md)
- [配置说明](./docs/configuration.md)
- [测试与可视化验证](./docs/testing.md)

## 目录结构

```text
src/
  Editor.php
  Preview.php
  EditorAsset.php
  dist/
docs/
  README.md
  installation.md
  usage.md
  configuration.md
```

## 说明

- 当前包通过 `composer.json` 将命名空间 `pjkui\markdown\` 映射到 `src/`
- `Editor` 默认输出隐藏的 `textarea` 加前端编辑器容器，便于表单提交
- `Preview` 适合详情页、只读预览区域等场景

更多细节请查看 [docs](./docs/README.md)。

## 测试

项目同时维护 **PHP 单元测试**（PHPUnit）、**前端单元测试**（Jest）和 **端到端回归测试**（Playwright）。

### 一键跑所有测试

```bash
npm run test:all
```

该脚本会依次执行：

1. `composer install` —— 安装 PHP 依赖
2. `npm install` —— 安装前端 / E2E 测试依赖
3. `vendor/bin/phpunit` —— PHP 单元测试（`tests/` 下的 `*Test.php`）
4. `jest` —— 前端转换器单元测试（`tests/unit/**/*.test.js`）
5. `playwright test` —— E2E 回归矩阵（`tests/e2e/*.spec.js`）

### 按类型单独跑

```bash
# PHP 单元测试（PHPUnit）
npm run test:php
# 等价：vendor/bin/phpunit

# JS 单元测试（Jest + jsdom）
npm test
# 等价：jest

# E2E 回归（Playwright + PHP 内置 server）
npm run test:e2e
```

### 前置依赖

首次运行前需要：

```bash
composer install
npm install
npx playwright install chromium firefox   # 只有首次需要
```

### Playwright 本地服务

Playwright 通过 `tests/run-server.sh` 启动 `php -S localhost:8080 -t examples examples/router.php`（即 `composer demo` 等价命令），测试结束自动关闭。无需手动起服务。

### 测试套件组织

- `tests/` —— 顶层 PHP 单元测试（bootstrap + 历史用例）
- `tests/unit/converter/` —— 前端 Markdown ↔ HTML 转换器单元测试
- `tests/integration/` —— PHP 集成测试（与 Yii2 框架交互的场景）
- `tests/e2e/` —— Playwright 端到端回归矩阵（R1–R6）

`phpunit.xml.dist` 将 `tests/unit` 与 `tests/integration` 分成两个 suite，可通过 `vendor/bin/phpunit --testsuite unit` 或 `--testsuite integration` 单独运行。
