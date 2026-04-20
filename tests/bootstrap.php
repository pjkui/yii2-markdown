<?php

defined('YII_DEBUG') or define('YII_DEBUG', true);
defined('YII_ENV') or define('YII_ENV', 'test');

require dirname(__DIR__) . '/vendor/autoload.php';
require dirname(__DIR__) . '/vendor/yiisoft/yii2/Yii.php';

\Yii::setAlias('@tests', __DIR__);
\Yii::setAlias('@pjkui/markdown', dirname(__DIR__) . '/src');

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
            'basePath' => dirname(__DIR__) . '/tests/runtime/assets',
            'baseUrl' => '/assets',
            'bundles' => [
                'yii\web\JqueryAsset' => false,
                'yii\web\YiiAsset' => false,
            ],
        ],
    ],
]);
