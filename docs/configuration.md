# 配置说明

## `Editor` 常用属性

### 顶层属性

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `model` | `yii\base\Model` | 绑定的模型对象 |
| `attribute` | `string` | 绑定的模型字段 |
| `value` | `string` | 输入值，当前主要用于自定义场景 |
| `defaultValue` | `string` | 编辑器初始 Markdown 内容 |
| `tagId` | `string` | 组件根字段 ID |
| `tagType` | `string` | 可选 `div` 或 `textarea`，当前默认使用 `div` 包裹隐藏字段 |
| `tagAttribute` | `array` | 底层隐藏字段的 HTML 属性 |
| `options` | `array` | 传给底层引擎（Cherry / Vditor）的配置以及扩展字段 |
| `isMarkdown` | `bool` | **v1.3.0+**：`true` 启动 Cherry Markdown 源码模式（默认），`false` 启动 Vditor WYSIWYG |
| `switchable` | `bool` | **v1.3.0+**：是否在工具栏注入"切换模式"按钮，默认 `true` |

## `options` 常见键

### 编辑器本身

| 键名 | 说明 |
| --- | --- |
| `id` | Cherry 实例容器 ID，组件内部会自动设置 |
| `toolbars` | 工具栏配置 |
| `editor` | 编辑区配置，如高度、默认模式 |
| `previewer` | 预览区配置 |
| `keydown` | 快捷键相关扩展配置 |
| `engine` | Markdown 解析配置 |
| `externals` | 外部依赖映射，如 `MathJax`、`katex`、`echarts` |

### 扩展字段

以下字段不是 Cherry 原生配置，而是 `Editor` 在注册脚本时额外使用：

| 键名 | 说明 |
| --- | --- |
| `url` | 文件上传接口地址 |
| `extra` | 上传附加参数 |
| `selector` | 目标字段选择器，组件内部自动处理 |
| `relative_urls` | 预留字段，当前默认 `false` |

## 默认工具栏

默认工具栏由 `Editor::MKDEditorToolbars()` 生成，包含以下主要能力：

- 撤销、重做
- 标题、加粗、斜体、删除线
- 颜色、字号
- 列表
- 插入清单、引用、分割线、图片、音频、视频、链接、代码、公式、目录、表格、PDF、Word
- 图表
- 编辑模式切换
- 代码主题
- 导出
- 设置
- 全屏

## 默认增强行为

`Editor` 在 `registerPlugin()` 中额外注册了以下行为：

1. 文件上传统一入口
2. 深色模式跟随 `data-theme`
3. `localStorage` 草稿自动保存与恢复
4. 字数统计状态栏
5. `Ctrl/⌘ + S` 提交表单
6. 离开页面未保存提醒
7. 表单提交后清理草稿

## `Preview` 配置

`Preview` 适合只读展示，常用属性比较少：

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `value` | `string` | 要渲染的 Markdown 内容 |
| `options` | `array` | Cherry 配置，组件会在运行时将模式切为 `previewOnly` |

其默认特点：

- 不显示主工具栏
- 保留移动端预览和复制侧边栏能力
- 高度默认约为 `80vh`

## 双引擎相关配置（v1.3.0+）

### `Editor` 双引擎属性

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `isMarkdown` | `bool` | `true` | `true`：启动 Cherry Markdown 源码模式；`false`：启动 Vditor 所见即所得模式 |

> `switchable` 字段已废弃（v1.6.0 起切换按钮始终注入到工具栏，无法通过属性关闭）。

---

### 资源包

| Asset | 包含内容 | 何时注册 |
|-------|---------|---------|
| `EditorAsset` | `cherry-markdown.js/css`、`upload-file.js` | `Editor::widget` 调用时自动注册 |
| `VditorAsset` | `vditor.min.js/css`、`dist/js/lute/lute.min.js` | 使用双引擎切换时**手动注册** |
| `ConverterAsset` | `marked.min.js`、`turndown.min.js`、`turndown-plugin-gfm.min.js`、`converter.js`、`dual-engine-controller.js` | 使用双引擎切换时**手动注册** |

```php
// 在 View 或 Controller::actionXxx 中注册
\pjkui\markdown\ConverterAsset::register($this);
\pjkui\markdown\VditorAsset::register($this);
```

> `ConverterAsset` 已包含 `dual-engine-controller.js`，无需单独加载控制器。

---

### `VditorEditor` 属性（直接使用时）

通过 `Editor::widget(['isMarkdown' => false])` 会自动路由到 `VditorEditor`。若直接实例化：

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `name` | `string` | `''` | 隐藏 `textarea` 的 `name`；为空时从 `model/attribute` 推导 |
| `model` | `Model\|null` | `null` | 绑定模型 |
| `attribute` | `string\|null` | `null` | 绑定字段 |
| `value` | `string` | `''` | 初始内容（优先级高于 `model` 属性值） |
| `clientOptions` | `array` | `[]` | 传给 `new Vditor(selector, options)` 的配置 |
| `uploadUrl` | `string` | `''` | 文件上传接口地址 |
| `uploadExtra` | `array` | `[]` | 上传附加参数 |

`clientOptions` 常用键：

| 键名 | 说明 | 默认值 |
|------|------|--------|
| `mode` | 编辑模式：`'wysiwyg'`（所见即所得）、`'ir'`（即时渲染）、`'sv'`（分屏预览） | `'wysiwyg'` |
| `height` | 编辑器高度 | Vditor 默认 |
| `placeholder` | 占位文本 | — |
| `toolbar` | 工具栏配置（数组） | Vditor 默认 + 末尾 M 徽章按钮 |
| `theme` | 主题：`'classic'` / `'dark'` | `'classic'` |
| `cache.enable` | 是否启用 Vditor 内部 localStorage 缓存 | `false`（已关闭） |

---

### 工具栏切换按钮

| 编辑器 | 按钮 | 样式 | 注入方式 |
|--------|------|------|---------|
| Cherry Markdown | **V** | 蓝色 20×20 圆角矩形 + 白色粗体，hover 缩放 | `Editor.php` 通过 DOM 注入到 `.cherry-toolbar .toolbar-left` |
| Vditor WYSIWYG | **M** | 同款徽章样式（内联样式，不依赖外部 CSS） | `VditorEditor.php` 通过 `options.toolbar.push` 原生配置注入 |

切换按钮选择器：`[data-yii2md-action="switch"]`（可用于 E2E 测试或自定义逻辑）。

深色模式适配：Cherry 的 V 按钮通过 CSS 类 `.yii2md-switch-badge` 跟随 `[data-theme="dark"]` 变为稍亮的蓝色。Vditor 的 M 按钮使用内联样式，深色模式下 Vditor 自身工具栏背景会提供对比。

---

### 双引擎控制器（`DualEngine`）

**全局 API：**

```js
window.Yii2Markdown.DualEngine.init(opts?)
// 自动扫描页面中所有 .yii2-markdown-root[data-instance-id] 并初始化
// 由 DOMContentLoaded 自动调用，无需手动调用

window.Yii2Markdown.DualEngine.switchTo(idOrAlias, targetEngine?)
// idOrAlias：实例 id（字符串/数字）或引擎别名（单实例时可省略 id）
// targetEngine：'cherry'|'md'|'markdown'  或  'vditor'|'wysiwyg'|'html'
// 返回 Promise<boolean>，切换成功返回 true

window.Yii2Markdown.DualEngine.revert(idOrAlias?)
// 放弃本次转换，恢复到切换前的快照
// 返回 boolean

window.Yii2Markdown.DualEngine.getInstance(id)
// 返回指定实例的内部状态对象（调试用）
```

**实例状态对象（`state`）常用字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 实例 ID（等于根容器 `data-instance-id`） |
| `engine` | `string` | 当前引擎：`'cherry'` 或 `'vditor'` |
| `root` | `HTMLElement` | 编辑器根容器（`.yii2-markdown-root`） |
| `input` | `HTMLTextAreaElement` | 绑定表单的隐藏 `textarea` |
| `mdInput` | `HTMLInputElement` | `{name}_md` 隐藏字段 |
| `htmlInput` | `HTMLInputElement` | `{name}_html` 隐藏字段 |
| `snapshot` | `{engine, value, time}\|null` | 切换前的快照（放弃转换时使用） |

---

### 互转 API（`Converter`）

```js
window.Yii2Markdown.Converter.markdownToHtml(md, options?)
// options 透传给 marked.parse()，默认 { gfm: true, breaks: false }
// 返回 string；失败或入参非法返回 ''

window.Yii2Markdown.Converter.htmlToMarkdown(html, options?)
// options 透传给 new TurndownService()
// 默认：headingStyle:'atx', bulletListMarker:'-', codeBlockStyle:'fenced'
// 返回 string；失败或入参非法返回 ''
```

**依赖（随 `ConverterAsset` 一并加载）：**
- [marked](https://marked.js.org/) 12.x（GFM 支持）
- [Turndown](https://github.com/mixmark-io/turndown)（HTML→MD）
- [turndown-plugin-gfm](https://github.com/mixmark-io/turndown-plugin-gfm)（GFM 扩展：表格、删除线、任务列表）

---

### DOM 约定

`Editor` / `VditorEditor` 渲染的根容器带有以下标识属性，`DualEngine` 通过这些属性识别和管理实例：

```html
<!-- Cherry 模式 -->
<div class="yii2-markdown-root yii2-markdown-root--cherry"
     data-engine="cherry"
     data-is-markdown="1"
     data-instance-id="2">
  <textarea name="Post[content]" hidden></textarea>
  <div id="cherry2"></div>
</div>

<!-- Vditor 模式 -->
<div class="yii2-markdown-root yii2-markdown-root--vditor"
     data-engine="vditor"
     data-is-markdown="0"
     data-instance-id="1">
  <div id="vditor1" class="yii2-markdown-vditor-mount"></div>
  <textarea name="Post[content]" hidden data-role="vditor-input"></textarea>
</div>
```

切换后 `data-engine` 和类名会自动更新，可用于 CSS 按引擎条件样式：

```css
/* 仅在 Vditor 模式下隐藏某元素 */
.yii2-markdown-root--vditor .my-md-only-tip {
    display: none;
}
```

---

### 全局对象速查

| 对象 | 类型 | 存在条件 |
|------|------|---------|
| `window.Yii2Markdown.DualEngine` | `object` | `ConverterAsset` 已加载 |
| `window.Yii2Markdown.Converter` | `object` | `ConverterAsset` 已加载 |
| `window.cherry{N}` | `Cherry` 实例 | N 号实例当前为 Cherry 模式 |
| `window.vditor_{N}` | `Vditor` 实例 | N 号实例当前为 Vditor 模式 |

---

## 配置建议

- 在表单页优先使用 `model + attribute`，由组件自动推导字段名和 ID
- 上传文件时始终传入 `options.url`
- 使用双引擎切换时，始终同时注册 `ConverterAsset` 和 `VditorAsset`
- 建议把 `{attribute}_md` 作为权威源存储，`{attribute}_html` 作为展示渲染缓存
- 若宿主系统已有深色模式，在根节点设置 `data-theme="dark"` 即可自动适配 Cherry 和状态栏样式
- 若页面有自己的草稿机制，可通过监听 `yii2md:afterSwitch` 在切换时清理对应的本地草稿 key
