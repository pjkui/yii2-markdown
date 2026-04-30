# yii2-markdown

`yii2-markdown` 是一个基于 [Cherry Markdown](https://github.com/Tencent/cherry-markdown) 与 [Vditor](https://github.com/Vanessa219/vditor) 封装的 Yii2 扩展，支持 **双引擎**——用户可在编辑器工具栏中随时在 Markdown 源码模式与所见即所得（WYSIWYG）模式之间切换，无需刷新页面。

**核心能力：**

- Markdown 编辑器组件 `pjkui\markdown\Editor`（Cherry Markdown 引擎）
- 所见即所得编辑器组件 `pjkui\markdown\VditorEditor`（Vditor 引擎）
- 只读预览组件 `pjkui\markdown\Preview`
- 工具栏一键切换，带确认对话框 + 一键放弃转换横幅
- 文件上传、草稿自动保存（LocalStorage）、快捷键提交（Ctrl/⌘+S）、字数统计
- 深色模式跟随 `data-theme="dark"`

---

## 安装

```bash
composer require pjkui/yii2-markdown
```

---

## 快速开始

### 纯 Markdown 模式（默认）

```php
use pjkui\markdown\Editor;

echo Editor::widget([
    'model'     => $model,
    'attribute' => 'content',
    'options'   => [
        'url'   => '/upload',       // 文件上传接口
        'extra' => ['type' => 'md'],
    ],
]);
```

### 所见即所得模式（WYSIWYG）

```php
echo Editor::widget([
    'model'      => $model,
    'attribute'  => 'content',
    'isMarkdown' => false,           // 启动即 WYSIWYG（Vditor）
    'options'    => ['url' => '/upload'],
]);
```

### 双引擎可切换（推荐）

默认以 Markdown 模式启动，工具栏末尾自动注入蓝色 **V** 按钮（切换到 WYSIWYG），切换后变为蓝色 **M** 按钮（切回 Markdown）。

**必须在页面中注册资源**，否则切换时 Vditor 未加载会失败：

```php
use pjkui\markdown\Editor;
use pjkui\markdown\ConverterAsset;
use pjkui\markdown\VditorAsset;

// 预加载双引擎资源（包含 dual-engine-controller.js）
ConverterAsset::register($this); // $this = \yii\web\View
VditorAsset::register($this);

echo Editor::widget([
    'model'     => $model,
    'attribute' => 'content',
    'options'   => ['url' => '/upload'],
]);
```

**表单后端接收**（切换后会多出 `_md` / `_html` 两个隐藏字段）：

```php
public function rules(): array
{
    return [
        [['content', 'content_md', 'content_html'], 'string'],
    ];
}

public function beforeSave($insert): bool
{
    if (!parent::beforeSave($insert)) return false;
    // 以 Markdown 为权威源，HTML 用作展示缓存
    if (!empty($this->content_md)) {
        $this->content = $this->content_md;
    }
    return true;
}
```

---

## 只读预览

```php
use pjkui\markdown\Preview;

echo Preview::widget([
    'value' => $model->content,  // Markdown 字符串
]);
```

---

## 切换事件监听

```js
document.addEventListener('yii2md:beforeSwitch', e => {
    console.log('即将切换', e.detail); // { instanceId, from, to }
});
document.addEventListener('yii2md:afterSwitch', e => {
    console.log('已切换到', e.detail.to);
});
document.addEventListener('yii2md:revert', e => {
    console.log('已放弃本次转换', e.detail);
});
```

---

## 编程式切换

```js
// 切换到所见即所得
window.Yii2Markdown.DualEngine.switchTo('vditor');

// 切换到 Markdown
window.Yii2Markdown.DualEngine.switchTo('cherry');

// 放弃本次转换，恢复切换前的内容和模式
window.Yii2Markdown.DualEngine.revert();
```

---

## 目录结构

```text
src/
  Editor.php            # 统一入口（按 isMarkdown 路由到 Cherry / Vditor）
  VditorEditor.php      # Vditor WYSIWYG 引擎
  Preview.php           # 只读预览
  EditorAsset.php       # Cherry 资源包
  VditorAsset.php       # Vditor 资源包
  ConverterAsset.php    # Markdown↔HTML 互转 + DualEngine 控制器
  dist/
    cherry-markdown.js/css
    vditor/
    dual-engine-controller.js  # 双引擎切换逻辑
    converter.js               # Markdown↔HTML 互转 API
docs/
  usage.md
  configuration.md
  migration-guide.md    # 双引擎升级指南
examples/
  index.php             # 本机可视化 Demo（composer demo 启动）
```

---

## 本机 Demo

```bash
composer demo
# 访问 http://127.0.0.1:8080/
```

Demo 页支持：
- Cherry ↔ Vditor 工具栏一键切换（含放弃转换）
- 深色 / 浅色主题切换（🌙/☀️）
- 文件上传、草稿恢复、表单提交回显

---

## 文档

| 文档 | 说明 |
|------|------|
| [usage.md](./docs/usage.md) | 完整使用示例 |
| [configuration.md](./docs/configuration.md) | 所有配置项说明 |
| [migration-guide.md](./docs/migration-guide.md) | v1.3+ 双引擎升级指南 |
| [testing.md](./docs/testing.md) | 测试与可视化验证 |

---

## 测试

项目同时维护 **PHPUnit**、**Jest** 和 **Playwright** 三套测试，共 **78 tests**。

```bash
# 一键跑所有测试
npm run test:all

# 分类运行
npm run test:php    # PHPUnit（18 tests）
npm test            # Jest 单元测试（34 tests）
npm run test:e2e    # Playwright E2E（26 tests）
```

首次运行前安装依赖：

```bash
composer install && npm install
npx playwright install msedge
```

### 测试套件

| 目录 | 工具 | 内容 |
|------|------|------|
| `tests/` | PHPUnit | PHP 组件单元 + 集成测试 |
| `tests/unit/converter/` | Jest | Markdown↔HTML 转换器，含覆盖率（93%） |
| `tests/e2e/` | Playwright | 双引擎切换 E2E 回归（T1–T9、E1–E7、R1–R6） |
