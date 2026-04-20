# 安装说明

## 环境要求

- PHP 版本应满足 Yii2 运行要求
- Yii2 `~2.0.0`
- 项目已启用 Composer 自动加载

当前扩展在 `composer.json` 中声明：

```json
{
  "type": "yii2-extension",
  "require": {
    "yiisoft/yii2": "~2.0.0"
  },
  "autoload": {
    "psr-4": {
      "pjkui\\markdown\\": "src/"
    }
  }
}
```

## Composer 安装

在 Yii2 项目根目录执行：

```bash
composer require pjkui/yii2-markdown
```

如果当前仓库就是扩展开发仓库，可在宿主项目中通过 path repository 或 vcs repository 引入。

## 安装后检查

安装完成后建议确认以下事项：

1. Composer 自动加载已刷新
2. 页面能够正常加载 `EditorAsset` 发布出来的 JS 和 CSS
3. 使用编辑器的页面允许输出前端脚本

## 静态资源

扩展自带已经构建好的前端文件，位于：

```text
src/dist/
```

资源由 `pjkui\markdown\EditorAsset` 发布，默认包含：

- `cherry-markdown.js`
- `upload-file.js`
- `cherry-markdown.css`
- `addons/`
- `fonts/`

通常不需要额外构建即可使用。
