#!/bin/bash

# Firecrawl 数据备份脚本
# 用途: 备份 Redis 数据和应用配置

set -e

# 配置
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="firecrawl_backup_${TIMESTAMP}"

# 创建备份目录
mkdir -p "${BACKUP_DIR}/${BACKUP_NAME}"

echo "🔄 开始备份 Firecrawl 数据..."

# 1. 备份 Redis 数据
echo "📦 备份 Redis 数据..."
docker compose exec -T redis redis-cli SAVE
docker compose cp redis:/data/dump.rdb "${BACKUP_DIR}/${BACKUP_NAME}/redis_dump.rdb"

# 2. 备份应用数据目录
if [ -d "./data" ]; then
    echo "📁 备份应用数据..."
    cp -r ./data "${BACKUP_DIR}/${BACKUP_NAME}/"
fi

# 3. 备份配置文件
echo "⚙️  备份配置文件..."
cp docker-compose.yml "${BACKUP_DIR}/${BACKUP_NAME}/"
if [ -f ".env" ]; then
    cp .env "${BACKUP_DIR}/${BACKUP_NAME}/"
fi

# 4. 创建压缩包
echo "🗜️  压缩备份文件..."
cd "${BACKUP_DIR}"
tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}"
rm -rf "${BACKUP_NAME}"
cd ..

# 5. 清理旧备份 (保留最近 7 天)
echo "🧹 清理旧备份..."
find "${BACKUP_DIR}" -name "firecrawl_backup_*.tar.gz" -mtime +7 -delete

echo "✅ 备份完成: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
