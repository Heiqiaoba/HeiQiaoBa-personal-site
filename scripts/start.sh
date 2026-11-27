#!/bin/bash
# 一键启动本地开发环境：Colima(Docker) → PostgreSQL → 后端 → 前端。
# 重复执行是安全的：已运行的服务会跳过。
# PID 记录到 .dev-pids，供 stop.sh 精确关闭。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PID_FILE="$ROOT/.dev-pids"
BACKEND_PORT="${BACKEND_PORT:-3100}"
FRONTEND_PORT="${FRONTEND_PORT:-5174}"

echo "==> [1/4] 检查 Docker 引擎 (Colima)"
if colima status >/dev/null 2>&1; then
  echo "    Colima 已在运行"
else
  echo "    启动 Colima..."
  colima start --cpu 2 --memory 4 >/tmp/colima-start.log 2>&1
  echo "    Colima 已启动"
fi

echo "==> [2/4] 启动 PostgreSQL"
docker compose -f "$ROOT/backend/docker-compose.yml" up -d postgres >/dev/null
for i in $(seq 1 40); do
  status="$(docker inspect -f '{{.State.Health.Status}}' heiqiaoba-personal-site-postgres 2>/dev/null || echo starting)"
  [ "$status" = "healthy" ] && break
  sleep 1
done
echo "    PostgreSQL: $status (localhost:5433)"

# 启动服务：若端口已有监听则跳过
start_service() {
  local name="$1" dir="$2" port="$3" log="$4"
  if nc -z -w 1 127.0.0.1 "$port" >/dev/null 2>&1; then
    echo "    $name 已在运行 (:$port)"
    return
  fi
  echo "    启动 $name (:$port)..."
  (cd "$dir" && nohup pnpm dev >"$log" 2>&1 & echo $! >>"$PID_FILE")
}

: >"$PID_FILE"
echo "==> [3/4] 启动后端"
start_service "后端" "$ROOT/backend" "$BACKEND_PORT" /tmp/personal-backend.log

echo "==> [4/4] 启动前端"
start_service "前端" "$ROOT/frontend" "$FRONTEND_PORT" /tmp/personal-frontend.log

echo "==> 等待服务就绪..."
for i in $(seq 1 30); do
  curl -sf "http://127.0.0.1:$BACKEND_PORT/api/v1/health" >/dev/null 2>&1 && break
  sleep 1
done

echo ""
echo "✅ 启动完成"
echo "   前端:    http://localhost:$FRONTEND_PORT"
echo "   后端:    http://localhost:$BACKEND_PORT"
echo "   API 文档: http://localhost:$BACKEND_PORT/docs"
echo "   日志:    /tmp/personal-backend.log  /tmp/personal-frontend.log"
