<?php
/**
 * PHP 内置 CLI Server 的路由脚本
 *
 * 启动：
 *   composer demo
 * 等价：
 *   YII2_MARKDOWN_DEMO=1 php -S 127.0.0.1:8080 -t examples examples/router.php
 *
 * 作用：
 * 1. 静态文件（assets / uploads 下已存在的文件）直接由内置服务器返回
 * 2. upload.php 走上传逻辑（自带 _guard.php 守卫）
 * 3. 其他所有路径交给 index.php 渲染
 */

$requestUri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

// 静态文件兜底：防止 ../ 这种路径穿越
$normalized = '/' . ltrim($requestUri, '/');
if (strpos($normalized, '..') === false) {
    $staticFile = __DIR__ . $normalized;
    if ($normalized !== '/' && is_file($staticFile)) {
        return false; // 交给 PHP 内置服务器直接读写文件
    }
}

// upload 接口单独入口
if ($requestUri === '/upload.php' || $requestUri === '/upload') {
    require __DIR__ . '/upload.php';
    return true;
}

// 双引擎 demo 入口（可通过 /dual-engine-demo.php、/dual、/?page=dual 三种方式访问）
if ($requestUri === '/dual-engine-demo.php' || $requestUri === '/dual') {
    require __DIR__ . '/dual-engine-demo.php';
    return true;
}
$page = $_GET['page'] ?? '';
if ($requestUri === '/' && $page === 'dual') {
    require __DIR__ . '/dual-engine-demo.php';
    return true;
}

// 其余请求统一交给 index.php
require __DIR__ . '/index.php';
