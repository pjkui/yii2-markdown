<?php
/**
 * 双引擎可视化 Demo（v1.3.0+）
 *
 * 演示：
 *  - Editor::widget(['isMarkdown' => true|false])  → 路由到 Cherry / Vditor
 *  - 切换前确认对话框 + 顶部"放弃转换"横幅
 *  - 双 hidden _md / _html 字段在表单提交时一并送达后端
 *  - Yii2Markdown.DualEngine 自定义事件钩子
 *
 * 启动（项目根目录）：
 *   composer demo
 * 然后访问：
 *   http://127.0.0.1:8080/dual-engine-demo.php
 *   http://127.0.0.1:8080/?page=dual         （等价的 router 入口）
 *
 * 安全：与 index.php / upload.php 共用 _guard.php，仅限 CLI Server + 本机 +
 *       YII2_MARKDOWN_DEMO=1。
 */

require __DIR__ . '/_guard.php';

defined('YII_DEBUG') or define('YII_DEBUG', true);
defined('YII_ENV') or define('YII_ENV', 'dev');

require dirname(__DIR__) . '/vendor/autoload.php';
require dirname(__DIR__) . '/vendor/yiisoft/yii2/Yii.php';

Yii::setAlias('@pjkui/markdown', dirname(__DIR__) . '/src');

// 运行时目录
foreach ([__DIR__ . '/assets', __DIR__ . '/uploads'] as $runtimeDir) {
    if (!is_dir($runtimeDir)) {
        @mkdir($runtimeDir, 0755, true);
    }
}

if (PHP_SAPI === 'cli-server') {
    $requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $staticFile = __DIR__ . $requestUri;
    if ($requestUri !== '/' && $requestUri !== '/dual-engine-demo.php' && is_file($staticFile)) {
        return false;
    }
}

$config = [
    'id' => 'yii2-markdown-dual-demo',
    'basePath' => dirname(__DIR__),
    'vendorPath' => dirname(__DIR__) . '/vendor',
    'aliases' => [
        '@web' => '',
        '@webroot' => __DIR__,
    ],
    'components' => [
        'request' => [
            'cookieValidationKey' => 'yii2-markdown-dual-demo-key',
            'enableCsrfValidation' => false,
            'scriptFile' => __FILE__,
            'scriptUrl' => '/dual-engine-demo.php',
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

// 演示模型
$model = new class extends yii\base\Model {
    public $title = '双引擎演示';
    public $content = <<<MD
# Yii2-Markdown 双引擎 Demo

> 这是 v1.3.0 新引入的双引擎演示页。

- **顶部工具条** 中的「切换到所见即所得 →」按钮，可在 Cherry 与 Vditor 之间切换
- 切换会先弹出 **确认对话框**，确认后顶部出现 **黄色横幅**，可一键 **放弃转换**
- 表单同时持久化 `content_md` 与 `content_html` 两个字段（提交后下方回显）

\`\`\`js
console.log('Hello, dual-engine!');
\`\`\`

| A | B | C |
|---|---|---|
| 1 | 2 | 3 |

切换到 WYSIWYG 后试试**加粗**、*斜体*、列表与表格的所见即所得编辑体验。
MD;

    /** @var bool 演示用：决定首次启动用 Markdown 还是 WYSIWYG */
    public $isMarkdown = true;

    /** @var string|null 后端"持久化"后用于回显的 content_md */
    public $content_md;
    /** @var string|null 后端"持久化"后用于回显的 content_html */
    public $content_html;

    public function formName(): string { return 'Post'; }

    public function rules(): array
    {
        return [
            [['title', 'content', 'content_md', 'content_html'], 'string'],
            ['isMarkdown', 'boolean'],
        ];
    }
};

$view = Yii::$app->view;

// ========== 表单回显数据 ==========
$submitted = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $model->load($_POST);
    $submitted = [
        'title' => $model->title,
        'isMarkdown' => $model->isMarkdown,
        'content_md_len' => strlen((string) $model->content_md),
        'content_html_len' => strlen((string) $model->content_html),
        'content_md_preview' => mb_substr((string) $model->content_md, 0, 240),
        'content_html_preview' => mb_substr((string) $model->content_html, 0, 240),
    ];
    // 把 _md 当权威源回填，让编辑器继续显示用户内容
    if (!empty($model->content_md)) {
        $model->content = $model->content_md;
    }
}

// 启动模式可通过 ?engine=wysiwyg 切换；持久化由前端 hidden + form 提交承担
if (isset($_GET['engine']) && $_GET['engine'] === 'wysiwyg') {
    $model->isMarkdown = false;
}

// ========== 资源注册：互转 + 控制器 + Vditor（为运行时切换预加载）==========
// 无论首屏是 Cherry 还是 Vditor，双引擎演示页都需要把两端资源都载好，
// 否则用户点「切换到所见即所得」时 `new window.Vditor(...)` 会因 Vditor 未定义而失败，
// 表现为 data-engine 不翻牌、window.vditor_<id> 不出现、E2E 10s 超时。
\pjkui\markdown\ConverterAsset::register($view);
\pjkui\markdown\VditorAsset::register($view);
$controllerPublishedUrl = Yii::$app->assetManager
    ->getPublishedUrl(Yii::getAlias('@pjkui/markdown/dist'))
    . '/dual-engine-controller.js';
$view->registerJsFile($controllerPublishedUrl, [
    'depends' => [
        \pjkui\markdown\ConverterAsset::class,
        \pjkui\markdown\VditorAsset::class,
    ],
    'position' => \yii\web\View::POS_END,
]);

ob_start();
?>

<h2 style="margin:0 0 8px 0;">Editor 双引擎演示（v1.3.0+）</h2>
<p style="color:#6b7280;margin:0 0 16px 0;">
    选择启动模式：
    <a href="?engine=md" <?= $model->isMarkdown ? 'style="font-weight:600;color:#1d4ed8;"' : '' ?>>Markdown</a>
    ·
    <a href="?engine=wysiwyg" <?= $model->isMarkdown ? '' : 'style="font-weight:600;color:#1d4ed8;"' ?>>所见即所得</a>
    · 也可在编辑区顶部工具条中随时切换
</p>

<?php if ($submitted): ?>
<div style="background:#ecfdf5;border:1px solid #a7f3d0;padding:12px;margin-bottom:16px;border-radius:4px;">
    <b>已接收表单提交（POST）：</b>
    <pre style="white-space:pre-wrap;margin:8px 0 0;font-size:12px;line-height:1.5;"><?= htmlspecialchars(print_r($submitted, true)) ?></pre>
</div>
<?php endif; ?>

<?php
echo yii\helpers\Html::beginForm('', 'post');
echo '<label style="display:block;margin-bottom:6px;font-weight:600;">标题</label>';
echo yii\helpers\Html::activeTextInput($model, 'title', [
    'style' => 'width:100%;padding:6px 10px;margin-bottom:16px;border:1px solid #d1d5db;border-radius:4px;',
]);

echo '<label style="display:block;margin-bottom:6px;font-weight:600;">正文（'
    . ($model->isMarkdown ? 'Cherry / Markdown' : 'Vditor / WYSIWYG')
    . '）</label>';
echo pjkui\markdown\Editor::widget([
    'model' => $model,
    'attribute' => 'content',
    'isMarkdown' => (bool) $model->isMarkdown,
    'options' => [
        'url' => '/upload.php',
        'extra' => ['type' => 'markdown'],
    ],
]);

echo '<div style="margin-top:16px;">';
echo yii\helpers\Html::submitButton('提交表单（含 _md / _html 两个隐藏字段）', [
    'style' => 'background:#2563eb;color:#fff;padding:8px 18px;border:none;border-radius:4px;cursor:pointer;font-size:14px;',
]);
echo ' <a href="/" style="margin-left:12px;color:#6b7280;">← 回到 index demo</a>';
echo ' <a href="https://github.com/pjkui/yii2-markdown/blob/master/docs/migration-guide.md" target="_blank" style="margin-left:12px;color:#6b7280;">查看迁移指南 →</a>';
echo '</div>';
echo yii\helpers\Html::endForm();
?>

<details style="margin-top:24px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:4px;padding:8px 12px;">
    <summary style="cursor:pointer;font-weight:600;">实时事件日志（yii2md:beforeSwitch / afterSwitch / revert）</summary>
    <pre id="evt-log" style="white-space:pre-wrap;margin:8px 0 0;font-size:12px;line-height:1.5;color:#374151;background:#fff;border:1px solid #e5e7eb;border-radius:3px;padding:8px;min-height:64px;max-height:200px;overflow:auto;">（操作切换/放弃后此处会出现日志）</pre>
</details>

<script>
(function(){
    var log = document.getElementById('evt-log');
    function append(name, detail){
        if (!log) return;
        if (log.textContent.indexOf('（') === 0) log.textContent = '';
        log.textContent += '[' + new Date().toLocaleTimeString() + '] ' + name
            + ' ' + JSON.stringify(detail) + '\n';
    }
    ['yii2md:beforeSwitch','yii2md:afterSwitch','yii2md:revert'].forEach(function(name){
        document.addEventListener(name, function(e){ append(name, e.detail || {}); });
    });
})();
</script>

<?php
$body = ob_get_clean();

$view->beginPage();
?><!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>双引擎 Demo · yii2-markdown</title>
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
    <h1>Yii2-Markdown · 双引擎可视化 Demo</h1>
    <div class="nav">
        <a href="/">编辑器</a>
        <a href="/?page=preview">预览</a>
        <a href="/dual-engine-demo.php">双引擎</a>
        <span>· 上传接口：<code>/upload.php</code></span>
        <span>· 文档：<a href="https://github.com/pjkui/yii2-markdown/blob/master/docs/migration-guide.md" target="_blank">migration-guide</a></span>
    </div>
    <?= $body ?>
</div>
<?php $view->endBody(); ?>
</body>
</html>
<?php
$view->endPage();
