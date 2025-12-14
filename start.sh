#!/bin/bash

# Firecrawl 快速启动脚本

set -e

echo "🚀 Firecrawl 快速启动"
echo "====================="

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo "⚠️  未找到 .env 文件,从模板创建..."
    cp .env.example .env
    echo ""
    echo "⚠️  重要: 请编辑 .env 文件并修改 API_KEY!"
    echo "   运行: nano .env"
    echo ""
    read -p "按回车键继续 (确保已修改 API_KEY)..." 
fi

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: 未安装 Docker"
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo "❌ 错误: 未安装 Docker Compose"
    exit 1
fi

# 创建必要的目录
mkdir -p data backups

# 启动服务
echo "📦 拉取 Docker 镜像..."
docker compose pull

echo "🔧 启动服务..."
docker compose up -d

echo "⏳ 等待服务就绪..."
sleep 15

# 健康检查
echo "🏥 检查服务状态..."
if curl -f http://localhost:3002/health > /dev/null 2>&1; then
    echo "✅ Firecrawl 已成功启动!"
    echo ""
    echo "📊 服务信息:"
    echo "   - API 地址: http://localhost:3002"
    echo "   - 健康检查: http://localhost:3002/health"
    echo ""
    echo "🔑 API 密钥: 请查看 .env 文件中的 API_KEY"
    echo ""
    echo "📝 测试命令:"
    echo "   curl -X POST http://localhost:3002/v0/scrape \\"
    echo "     -H 'Authorization: Bearer 你的API密钥' \\"
    echo "     -H 'Content-Type: application/json' \\"
    echo "     -d '{\"url\": \"https://example.com\"}'"
    echo ""
    echo "💡 查看日志: docker compose logs -f"
    echo "⏸️  停止服务: docker compose down"
else
    echo "⚠️  服务可能还在启动中..."
    echo "运行 'docker compose logs -f' 查看详细日志"
fi

echo ""
docker compose ps
