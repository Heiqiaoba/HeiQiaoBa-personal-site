#!/bin/bash
# 一键关闭本地开发环境：前端 + 后端 + PostgreSQL（可选 Colima）。
# 只关闭本项目启动的服务，不影响其他项目。
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PID_FILE="$ROOT/.dev-pids"
KEEP_DOCKER="${KEEP_DOCKER:-0}"

echo "==> [1/3] 关闭前端/后端进程"
# 优先按 PID 文件精确关闭
if [ -f "$PID_FILE" ]; then
  while read -r pid; do
    [ -n "$pid" ] || continue
    if kill -0 "$pid" 2>/dev/null; then
      # pnpm dev 启动的 node 子进程也要一起关：杀掉整个进程组
      pgid="$(ps -o pgid= -p "$pid" 2>/dev/null | tr -d ' ')"
      [ -n "$pgid" ] && kill -- "-$pgid" 2>/dev/null || true
      kill "$pid" 2>/dev/null || true
    fi
  done <"$PID_FILE"
  rm -f "$PID_FILE"
fi
# 兜底：按项目路径匹配 pnpm/vite/tsx 进程
pkill -f 'HeiQiaoBa-personal-site/frontend.*vite' 2>/dev/null || true
pkill -f 'HeiQiaoBa-personal-site/backend.*tsx' 2>/dev/null || true
echo "    已关闭"

echo "==> [2/3] 停止 PostgreSQL 容器"
docker compose -f "$ROOT/backend/docker-compose.yml" stop postgres >/dev/null 2>&1 || true
echo "    已停止"

echo "==> [3/3] Docker 引擎 (Colima)"
if [ "$KEEP_DOCKER" = "1" ]; then
  echo "    按要求保留 (KEEP_DOCKER=1)"
else
  echo "    保留运行（Colima 是共享的，其他项目可能也在用）"
  echo "    如需彻底关闭：colima stop"
fi

echo ""
echo "✅ 已关闭本项目所有服务"
echo "   重新启动：./scripts/start.sh"
