<?php
/**
 * 可视化 Demo 入口
 *
 * 正规启动方式（在项目根目录执行）：
 *   composer demo
 *
 * 等价命令：
 *   YII2_MARKDOWN_DEMO=1 php -S 127.0.0.1:8080 -t examples examples/router.php
 *
 * 然后访问：
 *   http://127.0.0.1:8080/            -> 编辑器页面（Editor）
 *   http://127.0.0.1:8080/?page=preview -> 预览页面（Preview）
 *
 * 注意：本文件及 upload.php 都受 _guard.php 保护，
 *       只会在本机 + CLI Server + 显式开启 DEMO 模式下工作，
 *       即使被误部署也不会对外暴露上传能力。
 */

require __DIR__ . '/_guard.php';

defined('YII_DEBUG') or define('YII_DEBUG', true);
defined('YII_ENV') or define('YII_ENV', 'dev');

require dirname(__DIR__) . '/vendor/autoload.php';
require dirname(__DIR__) . '/vendor/yiisoft/yii2/Yii.php';

Yii::setAlias('@pjkui/markdown', dirname(__DIR__) . '/src');

// —— 确保运行时目录存在（AssetManager 与上传目录） ——
foreach ([__DIR__ . '/assets', __DIR__ . '/uploads'] as $runtimeDir) {
    if (!is_dir($runtimeDir)) {
        @mkdir($runtimeDir, 0755, true);
    }
}

// —— 内置 Web 服务器：让 /assets/* 走框架的 AssetManager 发布目录 ——
if (PHP_SAPI === 'cli-server') {
    $requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $staticFile = __DIR__ . $requestUri;
    if ($requestUri !== '/' && is_file($staticFile)) {
        return false; // 让 PHP 内置服务器直接返回静态文件
    }
}

$config = [
    'id' => 'yii2-markdown-demo',
    'basePath' => dirname(__DIR__),
    'vendorPath' => dirname(__DIR__) . '/vendor',
    'aliases' => [
        '@web' => '',
        '@webroot' => __DIR__,
    ],
    'components' => [
        'request' => [
            'cookieValidationKey' => 'yii2-markdown-demo-key',
            'enableCsrfValidation' => false,
            'scriptFile' => __FILE__,
            'scriptUrl' => '/index.php',
        ],
        'assetManager' => [
            'basePath' => __DIR__ . '/assets',
            'baseUrl' => '/assets',
            'linkAssets' => false,
            'bundles' => [
                'yii\web\JqueryAsset' => false,
                'yii\web\YiiAsset' => false,
            ],
        ],
        'urlManager' => [
            'enablePrettyUrl' => false,
            'showScriptName' => false,
        ],
    ],
];

$app = new yii\web\Application($config);

// —— 简单路由：用 ?page= 参数切换展示页 ——
$page = $_GET['page'] ?? 'editor';

// 模拟一个 Yii Model，用于演示 Editor 绑定模型字段
$model = new class extends yii\base\Model {
    public $title = '示例标题';
    public $content = <<<MD
# Yii2-Markdown 可视化 Demo

这是一个 **Cherry Markdown** 编辑器的演示页。

- 试着在左侧输入内容，右侧会实时预览
- 支持 `Ctrl/⌘ + S` 触发表单提交
- 工具栏图片按钮会调用 `/upload.php` 模拟上传接口
- 编辑后会自动存本地草稿，刷新会提示恢复

> 请使用上方工具栏进行格式化操作。

```js
console.log('hello cherry-markdown');
```

| A | B | C |
|---|---|---|
| 1 | 2 | 3 |
MD;

    public function formName(): string
    {
        return 'Post';
    }

    public function rules(): array
    {
        return [
            [['title', 'content'], 'string'],
        ];
    }
};

// —— 渲染视图 ——
$view = Yii::$app->view;

ob_start();

if ($page === 'preview') {
    echo '<h2 style="margin:0 0 12px 0;">Preview 组件演示</h2>';
    echo '<p style="color:#666;">只读预览，不可编辑。</p>';
    echo pjkui\markdown\Preview::widget([
        'value' => $model->content,
    ]);
    echo '<p style="margin-top:24px;"><a href="/">← 回到编辑器</a></p>';
} else {
    echo '<h2 style="margin:0 0 12px 0;">Editor 组件演示</h2>';
    echo '<p style="color:#666;">提交后页面会刷新并在下方打印收到的 POST 数据。</p>';

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        echo '<div style="background:#ecfdf5;border:1px solid #a7f3d0;padding:10px 12px;margin-bottom:16px;border-radius:4px;">';
        echo '<b>已接收表单提交：</b><pre style="white-space:pre-wrap;margin:8px 0 0;">';
        echo htmlspecialchars(print_r($_POST, true));
        echo '</pre></div>';
    }

    echo yii\helpers\Html::beginForm('', 'post');
    echo '<label style="display:block;margin-bottom:6px;">标题</label>';
    echo yii\helpers\Html::activeTextInput($model, 'title', [
        'style' => 'width:100%;padding:6px 10px;margin-bottom:16px;border:1px solid #d1d5db;border-radius:4px;',
    ]);

    echo '<label style="display:block;margin-bottom:6px;">正文</label>';
    echo pjkui\markdown\Editor::widget([
        'model' => $model,
        'attribute' => 'content',
        'options' => [
            'url' => '/upload.php',
            'extra' => ['type' => 'markdown'],
        ],
    ]);

    echo '<div style="margin-top:16px;">';
    echo yii\helpers\Html::submitButton('提交 (Ctrl/⌘+S)', [
        'style' => 'background:#2563eb;color:#fff;padding:8px 20px;border:none;border-radius:4px;cursor:pointer;',
    ]);
    echo ' <a href="/?page=preview" style="margin-left:12px;">查看 Preview 演示 →</a>';
    echo '</div>';
    echo yii\helpers\Html::endForm();
}

$body = ob_get_clean();

$view->beginPage();
?><!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>Yii2-Markdown 可视化 Demo</title>
    <?php $view->head(); ?>
    <style>
        body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;margin:0;padding:24px;background:#f9fafb;color:#111827;}
        .container{max-width:1100px;margin:0 auto;background:#fff;padding:24px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.06);}
        h1{margin:0 0 8px 0;font-size:20px;}
        .nav{margin-bottom:16px;font-size:13px;color:#6b7280;}
        .nav a{color:#2563eb;text-decoration:none;margin-right:12px;}
    </style>
</head>
<body>
<?php $view->beginBody(); ?>
<div class="container">
    <h1>Yii2-Markdown 可视化 Demo</h1>
    <div class="nav">
        <a href="/">编辑器</a>
        <a href="/?page=preview">预览</a>
        <span>· 上传接口：<code>/upload.php</code></span>
    </div>
    <?= $body ?>
</div>
<?php $view->endBody(); ?>
</body>
</html>
<?php
$view->endPage();
