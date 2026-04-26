#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# 启动本地 PHP 内置 Web Server 用于 Playwright E2E 测试。
#
# 行为：
# - 使用 examples 目录作为 document root
# - 复用 examples/router.php 作为 front controller（与 composer demo 一致）
# - 监听 localhost:8080
# - 启用 YII2_MARKDOWN_DEMO=1 以通过 _guard.php 检查
# - 使用绝对路径，避免被调用方 CWD 影响
# -----------------------------------------------------------------------------
set -eu

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export YII2_MARKDOWN_DEMO=1

HOST="${HOST:-localhost}"
PORT="${PORT:-8080}"

echo "[tests/run-server.sh] starting php -S ${HOST}:${PORT} -t ${ROOT_DIR}/examples ${ROOT_DIR}/examples/router.php"
exec php -S "${HOST}:${PORT}" -t "${ROOT_DIR}/examples" "${ROOT_DIR}/examples/router.php"
