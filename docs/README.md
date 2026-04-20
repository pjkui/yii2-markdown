# 文档首页

这里整理了 `yii2-markdown` 的基础使用说明，方便在项目初始化后快速接入和维护。

## 文档列表

- [安装说明](./installation.md)
- [使用示例](./usage.md)
- [配置说明](./configuration.md)
- [测试与可视化验证](./testing.md)

## 组件概览

### `pjkui\markdown\Editor`

用于表单中的 Markdown 编辑。组件会渲染：

- 一个隐藏的 `textarea`，用于提交最终 Markdown 内容
- 一个 Cherry Markdown 编辑器容器

内置能力包括：

- 工具栏与侧边栏默认配置
- 字数统计
- 本地草稿自动保存与恢复
- `Ctrl/⌘ + S` 快捷提交
- 页面离开未保存提醒
- 文件上传回调
- 深色主题跟随

### `pjkui\markdown\Preview`

用于纯预览场景，适合：

- 文章详情页
- 后台内容预览
- 只读 Markdown 展示区

### `pjkui\markdown\EditorAsset`

负责发布 `src/dist` 下的 Cherry Markdown 资源文件。

## 推荐阅读顺序

1. 先看 [安装说明](./installation.md)
2. 再看 [使用示例](./usage.md)
3. 再看 [配置说明](./configuration.md)
4. 联调前查看 [测试与可视化验证](./testing.md)
