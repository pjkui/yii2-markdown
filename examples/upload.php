<?php
/**
 * 可视化 Demo：模拟文件上传接口
 *
 * 仅用于开发者在本机可视化验证 Editor 的上传行为，**不可**部署到公网。
 *
 * 安全策略：
 * - 通过 _guard.php 限定 CLI Server + localhost + 环境变量
 * - 仅接受 POST
 * - 扩展名白名单 + finfo MIME 校验
 * - 文件大小上限 5MB
 * - 重命名：完全丢弃原文件名，使用随机文件名 + 白名单扩展名
 * - uploads/ 目录下不允许执行脚本（见 uploads/.htaccess）
 */

require __DIR__ . '/_guard.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow');

/** @param int $code @param string $msg @return never */
function respond(int $code, string $msg, array $data = []): void
{
    http_response_code($code === 0 ? 200 : 400);
    echo json_encode(['code' => $code, 'msg' => $msg, 'data' => $data], JSON_UNESCAPED_UNICODE);
    exit;
}

// —— 仅允许 POST ——
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    respond(1, 'method not allowed');
}

// —— 上传目录（保持在 examples/uploads 下） ——
$uploadDir = __DIR__ . '/uploads';
if (!is_dir($uploadDir)) {
    @mkdir($uploadDir, 0755, true);
}

// —— 基本文件检查 ——
if (empty($_FILES)) {
    respond(1, 'no file received');
}

$file = reset($_FILES);
if (!is_array($file) || !isset($file['error'])) {
    respond(1, 'invalid upload payload');
}
if ($file['error'] !== UPLOAD_ERR_OK) {
    respond(1, 'upload error code: ' . (int)$file['error']);
}
if (!is_uploaded_file($file['tmp_name'] ?? '')) {
    respond(1, 'not an uploaded file');
}

// —— 大小限制：5 MB ——
$maxSize = 5 * 1024 * 1024;
if ((int)$file['size'] <= 0 || (int)$file['size'] > $maxSize) {
    respond(1, 'file size out of range (max 5MB)');
}

// —— 扩展名 / MIME 白名单 ——
// key: 允许的小写扩展名 | value: 允许的 MIME 前缀集合
$allowList = [
    'jpg'  => ['image/jpeg'],
    'jpeg' => ['image/jpeg'],
    'png'  => ['image/png'],
    'gif'  => ['image/gif'],
    'webp' => ['image/webp'],
    'svg'  => ['image/svg+xml', 'text/plain', 'text/xml', 'application/xml'],
    'bmp'  => ['image/bmp', 'image/x-ms-bmp'],
    'txt'  => ['text/plain'],
    'md'   => ['text/plain', 'text/markdown'],
    'pdf'  => ['application/pdf'],
];

$originName = (string)($file['name'] ?? '');
$ext = strtolower((string)pathinfo($originName, PATHINFO_EXTENSION));
if ($ext === '' || !isset($allowList[$ext])) {
    respond(1, 'file extension not allowed: ' . $ext);
}

// —— 使用 finfo 校验真实 MIME ——
$realMime = 'application/octet-stream';
if (class_exists('finfo')) {
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $detected = $finfo->file($file['tmp_name']);
    if (is_string($detected) && $detected !== '') {
        $realMime = $detected;
    }
}
$mimeAllowed = false;
foreach ($allowList[$ext] as $prefix) {
    if (strcasecmp($realMime, $prefix) === 0) {
        $mimeAllowed = true;
        break;
    }
}
if (!$mimeAllowed) {
    respond(1, 'file content does not match extension (detected: ' . $realMime . ')');
}

// —— 生成安全文件名（完全丢弃用户输入的文件名） ——
try {
    $rand = bin2hex(random_bytes(8));
} catch (Throwable $e) {
    $rand = substr(hash('sha256', uniqid('', true)), 0, 16);
}
$safeName = date('Ymd_His') . '_' . $rand . '.' . $ext;
$dest = $uploadDir . '/' . $safeName;

if (!move_uploaded_file($file['tmp_name'], $dest)) {
    respond(1, 'move_uploaded_file failed');
}
@chmod($dest, 0644);

respond(0, 'ok', [
    'url'  => '/uploads/' . $safeName,
    'name' => $safeName,
    'size' => (int)$file['size'],
    'mime' => $realMime,
]);
