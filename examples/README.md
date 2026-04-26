# Examples: 可视化验证入口

这是一个不依赖完整 Yii2 应用的最小演示环境，用于开发 `pjkui/yii2-markdown` 时对 `Editor` / `Preview` 组件做可视化交互验证。

> ⚠️ **本目录下的文件仅用于开发自检，严禁部署到公网服务器。**
> 为防止误部署造成风险，`index.php` 与 `upload.php` 都做了严格的运行时自检（见下方"安全策略"）。
> 通过 `composer archive` / `composer require` 分发的正式包也**不会**包含本目录（见 `.gitattributes`、`composer.json archive.exclude`）。

## 启动方式

在仓库根目录执行：

```bash
composer demo
```

等价的原始命令：

```bash
YII2_MARKDOWN_DEMO=1 php -S 127.0.0.1:8080 -t examples examples/router.php
```

启动后浏览器访问：

| URL | 内容 |
| --- | --- |
| http://127.0.0.1:8080/ | **Editor 演示**（ActiveForm + 提交回显） |
| http://127.0.0.1:8080/?page=preview | **Preview 只读预览演示** |
| http://127.0.0.1:8080/dual-engine-demo.php | **双引擎演示**（Cherry / Vditor 切换、备份/放弃、双 hidden 字段、事件日志） |
| http://127.0.0.1:8080/?page=dual | 双引擎演示（短链） |
| http://127.0.0.1:8080/upload.php | 模拟文件上传接口（由编辑器内部调用） |

停止服务：在启动的终端按 `Ctrl+C`。

## 安全策略

`examples/_guard.php` 会在 `index.php` / `upload.php` 入口被加载之前执行，**三项检查必须同时通过**，否则直接返回 `403 Forbidden`：

1. `PHP_SAPI === 'cli-server'` — 必须通过 PHP 内置 CLI 服务器运行（不允许 fpm/cgi/apache）
2. `getenv('YII2_MARKDOWN_DEMO') === '1'` — 必须显式开启（由 `composer demo` 自动注入）
3. `REMOTE_ADDR ∈ {127.0.0.1, ::1}` — 只接受本机回环来源

上传接口额外做了：

- 仅允许 `POST`
- 5 MB 大小上限
- 扩展名白名单：`jpg/jpeg/png/gif/webp/svg/bmp/txt/md/pdf`
- 用 `finfo` 检测真实 MIME，与扩展名做严格匹配
- 完全丢弃用户上传的文件名，按 `时间戳 + 随机串 + 扩展名` 重命名
- 响应头 `X-Content-Type-Options: nosniff`、`X-Robots-Tag: noindex`

`uploads/.htaccess` 在不慎被 Apache 托管时会：

- 禁止执行 `.php/.phtml/.phar/.py/.sh/.cgi` 等脚本
- 关闭目录索引
- 强制所有文件以 `application/octet-stream` 返回

## 验证要点清单

- [ ] 页面打开后编辑器正常渲染、工具栏完整
- [ ] 初始内容正确加载，实时预览同步
- [ ] 工具栏图片 / 拖拽 / 粘贴 走到 `/upload.php` 并回显图片
- [ ] 编辑后下方状态栏提示"已保存草稿 ..."，刷新页面可提示恢复
- [ ] 按 `Ctrl/⌘+S` 能触发表单提交，POST 内容会在页面顶部回显
- [ ] `?page=preview` 页面不可编辑，Markdown 渲染正确（代码、表格等）
- [ ] 未保存直接关闭或跳转时，会弹出"您有未保存的修改"提示

## 文件说明

```text
examples/
  _guard.php             # 运行时守卫（SAPI / 环境变量 / 来源 IP 检查）
  router.php             # PHP 内置服务器的路由入口
  index.php              # Demo 主入口，最小 Yii2 Web 应用
  dual-engine-demo.php   # 双引擎演示（v1.3.0+，Cherry/Vditor 切换 + 备份/放弃）
  upload.php             # 受限的模拟上传接口
  assets/                # 运行时 AssetManager 发布目录（已在 .gitignore）
  uploads/               # 演示上传文件存放目录（已在 .gitignore）
    .htaccess            # 防执行 + 防列举
    index.html           # 目录兜底
  README.md
```

## 清理

```bash
rm -rf examples/assets examples/uploads
```
