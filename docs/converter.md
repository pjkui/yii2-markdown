# Markdown ↔ HTML 互转工具（Converter）

`pjkui\markdown\ConverterAsset` 提供一组**独立于编辑器实例**的转换 API，可以在没有渲染 `Editor` / `VditorEditor` 的页面直接调用，典型用途：

1. 用户切换 `isMarkdown` 时，把当前内容从 Markdown 转成 HTML（或反之）传给新引擎；
2. 后端历史数据迁移（Markdown 库迁 WYSIWYG、或反过来）；
3. 在表单渲染前做格式归一（例如：数据库里同时存在两种格式，先统一再回填编辑器）。

## 安装与注册

在需要使用转换的视图（或全局布局）里注册 AssetBundle：

```php
use pjkui\markdown\ConverterAsset;

ConverterAsset::register($this); // $this 是 \yii\web\View 实例
```

它会加载以下 JS（均已随扩展预拉到 `src/dist/` 下，无需外网访问）：

| 文件 | 说明 |
| --- | --- |
| `marked.min.js` | [marked](https://github.com/markedjs/marked) — Markdown → HTML |
| `turndown.min.js` | [Turndown](https://github.com/mixmark-io/turndown) — HTML → Markdown |
| `turndown-plugin-gfm.min.js` | 表格 / 删除线 / 任务列表 GFM 插件 |
| `converter.js` | 统一暴露 `window.Yii2Markdown.Converter` |

## API

### `Yii2Markdown.Converter.markdownToHtml(md, options?) → string`

把 Markdown 源文本转为 HTML 片段。

- `md`：Markdown 字符串（非字符串会尝试 `String(md)`）；`''` / `null` / `undefined` 返回 `''`。
- `options`：透传给 [marked.parse](https://marked.js.org/using_advanced) 的选项。默认 `{ gfm: true, breaks: false }`。

```js
var html = Yii2Markdown.Converter.markdownToHtml('# Hello\n\n- a\n- b');
// '<h1>Hello</h1>\n<ul>\n<li>a</li>\n<li>b</li>\n</ul>'
```

### `Yii2Markdown.Converter.htmlToMarkdown(html, options?) → string`

把 HTML 转换为 Markdown 源文本。

- `html`：HTML 字符串；`''` / `null` / `undefined` 返回 `''`。
- `options`：透传给 [TurndownService 构造函数](https://github.com/mixmark-io/turndown#options)。默认：
  - `headingStyle: 'atx'`（即 `#` 风格）
  - `bulletListMarker: '-'`
  - `codeBlockStyle: 'fenced'`（即 ``` 风格）
  - `emDelimiter: '*'`
  - `strongDelimiter: '**'`
  - `linkStyle: 'inlined'`

注册后的 Turndown 实例会自动启用 `turndown-plugin-gfm`（表格、删除线、任务列表、高亮代码块）。

```js
var md = Yii2Markdown.Converter.htmlToMarkdown('<h1>Title</h1><p><strong>x</strong></p>');
// '# Title\n\n**x**'
```

## 错误处理

- 依赖（`marked` / `TurndownService` / `turndownPluginGfm`）未加载时，API 返回空字符串并在控制台打印 `[yii2-markdown/Converter]` 开头的 warning，**不会抛异常**。
- 输入为空 / `null` / `undefined` 返回 `''`。

## 已知限制（不可逆元素清单）

以下元素做 HTML → Markdown 转换时会出现**不可逆**或**降级**：

| 场景 | 行为 |
| --- | --- |
| `<span style="color:red">` / `<font>` 等字号/颜色样式 | 全部丢失（Markdown 原生不支持内联样式） |
| 内联 `style` / `class` 属性 | 被 Turndown 丢弃 |
| `<table>` 的 `colspan` / `rowspan` | 无法表示（GFM 表格不支持合并单元格），会被拆分成多行 |
| `<details>` / `<summary>` | 会原样输出成 HTML 块（Markdown 无对应语法） |
| 自定义 HTML 组件（如 `<my-widget>`） | 视作未知节点，内容会被平铺输出 |
| 复杂嵌套列表（>3 层） | 层级可能被压平 |
| `~~strike~~` 双波浪号 | 经 HTML 往返后会变成 `~strike~`（turndown-plugin-gfm 默认单波浪号），marked 两种均能解析 |
| Vditor / Cherry 的扩展语法（公式、流程图、echarts） | 不会被转换，只会保留原始 HTML 或回退成文本 |

> **建议**：在切换模式前，先做一次 `markdownToHtml(md)` → `htmlToMarkdown(html)` 的回环测试，检查是否有数据损失，必要时给用户弹窗确认。

## 和编辑器的配合

- 纯 Markdown（Cherry）⇄ WYSIWYG（Vditor）切换流程推荐：
  1. 从 Cherry 取 `getMarkdown()` → `markdownToHtml(md)` → 喂给 Vditor；
  2. 从 Vditor 取 `getHTML()` → `htmlToMarkdown(html)` → 喂给 Cherry。
- `Editor` widget 的 `isMarkdown` 属性本身不做即时转换，切换交互由前端 UI 控制（见 issue #6）。

## 测试

JS 单元测试位于 `tests/unit/converter/converter.test.js`（Jest + jsdom），共 14 条用例覆盖：

- 标题、加粗 / 斜体、有序 / 无序列表、链接、图片、行内代码 / 代码块、引用、GFM 表格、删除线、任务列表
- HTML → Markdown 基本块元素、列表 + 链接
- Markdown → HTML → Markdown 回环等价
- 空值 / null / undefined 健壮性

运行：

```bash
npm test -- tests/unit/converter
```
