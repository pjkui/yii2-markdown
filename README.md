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
