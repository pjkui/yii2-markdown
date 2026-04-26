<?php

defined('YII_DEBUG') or define('YII_DEBUG', true);
defined('YII_ENV') or define('YII_ENV', 'test');

require dirname(__DIR__) . '/vendor/autoload.php';
require dirname(__DIR__) . '/vendor/yiisoft/yii2/Yii.php';

\Yii::setAlias('@tests', __DIR__);
\Yii::setAlias('@pjkui/markdown', dirname(__DIR__) . '/src');

// 确保运行时目录存在（AssetManager basePath 必须是已存在目录）
$runtimeAssets = __DIR__ . '/runtime/assets';
if (!is_dir($runtimeAssets)) {
    mkdir($runtimeAssets, 0777, true);
}

new \yii\web\Application([
    'id' => 'yii2-markdown-tests',
    'basePath' => dirname(__DIR__),
    'vendorPath' => dirname(__DIR__) . '/vendor',
    'components' => [
        'request' => [
            'cookieValidationKey' => 'yii2-markdown-test-key',
            'scriptFile' => __FILE__,
            'scriptUrl' => '/index-test.php',
        ],
        'assetManager' => [
            'basePath' => $runtimeAssets,
            'baseUrl' => '/assets',
            'bundles' => [
                'yii\web\JqueryAsset' => false,
                'yii\web\YiiAsset' => false,
            ],
        ],
    ],
]);
