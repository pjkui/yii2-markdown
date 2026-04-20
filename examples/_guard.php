<?php
/**
 * 可视化 Demo 的安全守卫（guard）
 *
 * 目标：防止本目录下的文件被意外部署到公网服务器后，
 * 被外部调用造成上传/任意文件落地等安全风险。
 *
 * 只有**同时**满足下列条件时，Demo 的脚本才允许继续执行：
 *
 *   1. 运行在 PHP 内置 CLI 服务器（`PHP_SAPI === 'cli-server'`）
 *   2. 环境变量 `YII2_MARKDOWN_DEMO=1`（由 `composer demo` 自动注入）
 *   3. 请求来源是本机回环（127.0.0.1 / ::1）
 *
 * 任何一项不满足，立即返回 403 并结束请求。
 *
 * 这样即使有人把 `examples/` 目录误传上 FPM/Apache 服务器，
 * 或直接从公网发起请求，都不会触发上传逻辑或应用初始化。
 */

if (!defined('YII2_MARKDOWN_DEMO_GUARD')) {
    define('YII2_MARKDOWN_DEMO_GUARD', true);

    $denyReason = null;

    // 1) 必须是 PHP 内置 CLI 服务器
    if (PHP_SAPI !== 'cli-server') {
        $denyReason = 'Demo is only allowed to run under PHP built-in CLI server.';
    }

    // 2) 必须显式开启（由 composer demo 注入环境变量）
    if ($denyReason === null && getenv('YII2_MARKDOWN_DEMO') !== '1') {
        $denyReason = 'Demo mode is not enabled. Use "composer demo" to start it.';
    }

    // 3) 只接受本机回环地址
    if ($denyReason === null) {
        $remote = $_SERVER['REMOTE_ADDR'] ?? '';
        $allowed = ['127.0.0.1', '::1', '0:0:0:0:0:0:0:1'];
        if (!in_array($remote, $allowed, true)) {
            $denyReason = 'Demo accepts connections from localhost only.';
        }
    }

    if ($denyReason !== null) {
        http_response_code(403);
        header('Content-Type: text/plain; charset=utf-8');
        header('X-Robots-Tag: noindex, nofollow, noarchive');
        echo "403 Forbidden\n\n" . $denyReason . "\n";
        exit;
    }
}
