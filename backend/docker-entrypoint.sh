#!/bin/sh
# 容器启动入口：先执行数据库迁移（幂等，可重复运行），再启动服务。
# 这样无论用 docker-compose、Render 还是其他平台，迁移都会自动执行。
set -e

echo "==> Running database migrations..."
node dist/db/migrate.js

echo "==> Starting server..."
exec "$@"
