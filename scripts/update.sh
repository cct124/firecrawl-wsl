#!/bin/bash

# Firecrawl 更新脚本
# 用途: 安全更新到最新版本

set -e

echo "🔄 Firecrawl 更新脚本"
echo "===================="

# 1. 备份当前数据
echo "📦 创建备份..."
./scripts/backup.sh

# 2. 拉取最新镜像
echo "⬇️  拉取最新镜像..."
docker compose pull

# 3. 停止服务
echo "⏸️  停止当前服务..."
docker compose down

# 4. 启动更新后的服务
echo "🚀 启动更新后的服务..."
docker compose up -d

# 5. 等待服务就绪
echo "⏳ 等待服务启动..."
sleep 10

# 6. 健康检查
echo "🏥 执行健康检查..."
if curl -f http://localhost:3002/health > /dev/null 2>&1; then
    echo "✅ 服务运行正常"
else
    echo "⚠️  警告: 健康检查失败,请检查日志"
    docker compose logs --tail=50
fi

# 7. 显示版本信息
echo ""
echo "📊 服务状态:"
docker compose ps

echo ""
echo "✅ 更新完成!"
echo "💡 提示: 使用 'docker compose logs -f' 查看日志"
