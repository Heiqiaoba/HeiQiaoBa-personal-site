#!/bin/bash
# 备份脚本：PostgreSQL 数据库 + uploads 图片目录，打包成单个 tar.gz。
#
# 用法：
#   ./scripts/backup.sh [输出目录]
# 默认输出到 ./backups/。
#
# 恢复：
#   1. 解压：tar xzf backup-xxx.tar.gz -C restore/
#   2. 数据库：docker compose exec -T postgres psql -U postgres -d app < restore/database.sql
#       （或用 pg_restore：docker compose exec -T postgres pg_restore -U postgres -d app < restore/database.dump）
#   3. 图片：把 restore/uploads/ 里的文件拷回 backend/uploads/
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${1:-$ROOT/backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

mkdir -p "$OUT_DIR"

echo "==> 导出数据库..."
# 从 .env.production 读取凭据（若存在），否则用 compose 默认值
if [ -f "$ROOT/.env.production" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ROOT/.env.production"
  set +a
fi
PG_USER="${POSTGRES_USER:-postgres}"
PG_DB="${POSTGRES_DB:-app}"

cd "$ROOT"
docker compose exec -T postgres pg_dump -U "$PG_USER" -d "$PG_DB" --no-owner --clean > "$WORK/database.sql"
echo "数据库导出完成: $(wc -c < "$WORK/database.sql") bytes"

echo "==> 复制 uploads..."
if [ -d "$ROOT/backend/uploads" ]; then
  cp -a "$ROOT/backend/uploads" "$WORK/uploads"
  echo "uploads 复制完成: $(find "$WORK/uploads" -type f | wc -l | tr -d ' ') 个文件"
else
  echo "uploads 目录不存在，跳过"
fi

echo "==> 打包..."
tar czf "$OUT_DIR/backup-$STAMP.tar.gz" -C "$WORK" .
echo "✅ 备份完成: $OUT_DIR/backup-$STAMP.tar.gz"
