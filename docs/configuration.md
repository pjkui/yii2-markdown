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
| `options` | `array` | 传给 Cherry Markdown 的配置以及扩展字段 |

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

## 配置建议

- 在表单页优先使用 `model + attribute`
- 上传文件时始终传入 `options.url`
- 若宿主系统已有自己的草稿机制，可考虑后续把本地草稿逻辑抽为可开关配置
- 若页面本身支持深色模式，建议统一设置根节点 `data-theme`
