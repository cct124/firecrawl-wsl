#!/bin/bash

# Firecrawl 数据恢复脚本
# 用途: 从备份恢复 Redis 数据和应用配置

set -e

# 检查参数
if [ $# -eq 0 ]; then
    echo "❌ 错误: 请提供备份文件路径"
    echo "用法: $0 <backup_file.tar.gz>"
    exit 1
fi

BACKUP_FILE=$1
TEMP_DIR="./temp_restore"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "❌ 错误: 备份文件不存在: ${BACKUP_FILE}"
    exit 1
fi

echo "🔄 开始恢复 Firecrawl 数据..."

# 1. 解压备份文件
echo "📦 解压备份文件..."
mkdir -p "${TEMP_DIR}"
tar -xzf "${BACKUP_FILE}" -C "${TEMP_DIR}"

BACKUP_NAME=$(basename "${BACKUP_FILE}" .tar.gz)
RESTORE_PATH="${TEMP_DIR}/${BACKUP_NAME}"

# 2. 停止服务
echo "⏸️  停止服务..."
docker compose down

# 3. 恢复 Redis 数据
if [ -f "${RESTORE_PATH}/redis_dump.rdb" ]; then
    echo "💾 恢复 Redis 数据..."
    # 启动 Redis
    docker compose up -d redis
    sleep 3
    # 复制数据文件
    docker compose cp "${RESTORE_PATH}/redis_dump.rdb" redis:/data/dump.rdb
    docker compose restart redis
    sleep 2
fi

# 4. 恢复应用数据
if [ -d "${RESTORE_PATH}/data" ]; then
    echo "📁 恢复应用数据..."
    rm -rf ./data
    cp -r "${RESTORE_PATH}/data" ./data
fi

# 5. 恢复配置文件 (可选)
read -p "是否恢复配置文件? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -f "${RESTORE_PATH}/docker-compose.yml" ]; then
        cp "${RESTORE_PATH}/docker-compose.yml" ./docker-compose.yml
        echo "✅ 已恢复 docker-compose.yml"
    fi
    if [ -f "${RESTORE_PATH}/.env" ]; then
        cp "${RESTORE_PATH}/.env" ./.env
        echo "✅ 已恢复 .env"
    fi
fi

# 6. 清理临时文件
echo "🧹 清理临时文件..."
rm -rf "${TEMP_DIR}"

# 7. 重启所有服务
echo "🚀 重启服务..."
docker compose up -d

echo "✅ 恢复完成!"
echo "📝 请检查服务状态: docker compose ps"
