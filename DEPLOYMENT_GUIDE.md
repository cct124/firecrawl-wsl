# 🚀 Firecrawl 自托管服务部署指南

## 📋 目录

- [系统要求](#系统要求)
- [快速开始](#快速开始)
- [详细部署步骤](#详细部署步骤)
- [功能测试](#功能测试)
- [生产环境配置](#生产环境配置)
- [故障排查](#故障排查)

## 系统要求

### 硬件要求
- **CPU**: 2 核心或以上
- **内存**: 4GB RAM（推荐 8GB）
- **磁盘**: 至少 20GB 可用空间
- **网络**: 稳定的互联网连接

### 软件要求
- **操作系统**: Linux (Ubuntu 20.04+, Debian 11+)、macOS 或 Windows with WSL2
- **Docker**: 20.10+ 
- **Docker Compose**: 2.0+
- **Git**: 2.x+

### 检查依赖
```bash
# 检查 Docker
docker --version

# 检查 Docker Compose
docker compose version

# 检查 Git
git --version
```

## 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/mendableai/firecrawl.git
cd firecrawl

# 2. 配置环境变量
cat > .env << EOF
PORT=3002
NUM_WORKERS_PER_QUEUE=8
CRAWL_CONCURRENT_REQUESTS=10
USE_DB_AUTHENTICATION=false
ALLOW_LOCAL_WEBHOOKS=true
EOF

# 3. 构建并启动服务
docker compose build
docker compose up -d

# 4. 验证服务
curl http://localhost:3002/
```

## 详细部署步骤

### 步骤 1: 克隆项目

```bash
# 克隆官方仓库
git clone https://github.com/mendableai/firecrawl.git
cd firecrawl

# 或使用 SSH
git clone git@github.com:mendableai/firecrawl.git
cd firecrawl
```

### 步骤 2: 配置环境变量

创建 `.env` 文件并配置必要的环境变量：

```bash
nano .env
```

**基础配置**（必需）：
```env
# API 端口
PORT=3002

# Worker 配置
NUM_WORKERS_PER_QUEUE=8
CRAWL_CONCURRENT_REQUESTS=10
MAX_CONCURRENT_JOBS=5
BROWSER_POOL_SIZE=5

# 数据库认证（自托管关闭）
USE_DB_AUTHENTICATION=false

# 允许本地 Webhook（修复搜索功能）
ALLOW_LOCAL_WEBHOOKS=true
```

**可选配置**：
```env
# 日志级别
LOGGING_LEVEL=info

# Redis 配置
REDIS_URL=redis://redis:6379

# PostgreSQL 配置
POSTGRES_HOST=nuq-postgres
POSTGRES_PORT=5432
POSTGRES_USER=firecrawl
POSTGRES_PASSWORD=firecrawl_password
POSTGRES_DB=firecrawl

# Playwright 服务
PLAYWRIGHT_MICROSERVICE_URL=http://playwright-service:3000/scrape
```

### 步骤 3: 构建 Docker 镜像

使用源码构建本地镜像：

```bash
# 构建所有服务镜像（首次构建需要 5-10 分钟）
docker compose build

# 查看构建的镜像
docker images | grep firecrawl
```

**预期输出**：
```
firecrawl-api                    latest
firecrawl-playwright-service     latest
firecrawl-nuq-postgres          latest
```

### 步骤 4: 启动服务

```bash
# 启动所有服务
docker compose up -d

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f
```

**预期运行的容器**：
- `firecrawl-api-1` - 主 API 服务
- `firecrawl-nuq-postgres-1` - PostgreSQL 数据库
- `firecrawl-redis-1` - Redis 缓存
- `firecrawl-playwright-service-1` - 浏览器服务

### 步骤 5: 验证部署

```bash
# 检查 API 状态
curl http://localhost:3002/

# 预期输出
# {"message":"Firecrawl API","documentation_url":"https://docs.firecrawl.dev"}
```

## 功能测试

### 1. 测试网页抓取（Scrape）

```bash
curl -X POST http://localhost:3002/v0/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

### 2. 测试批量爬取（Crawl）

```bash
# 启动爬取任务
curl -X POST http://localhost:3002/v0/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "url":"https://example.com",
    "limit":5,
    "scrapeOptions":{"formats":["markdown"]}
  }'

# 获取任务 ID 后查询状态
curl http://localhost:3002/v0/crawl/status/{jobId}
```

### 3. 测试搜索功能（Search）

```bash
curl -X POST http://localhost:3002/v0/search \
  -H "Content-Type: application/json" \
  -d '{"query":"Python programming","limit":3}'
```

## 生产环境配置

### 1. 性能优化

编辑 `.env` 文件调整性能参数：

```env
# 高配置服务器（8+ 核心，16GB+ RAM）
NUM_WORKERS_PER_QUEUE=16
CRAWL_CONCURRENT_REQUESTS=20
MAX_CONCURRENT_JOBS=10
BROWSER_POOL_SIZE=10
```

### 2. 配置 systemd 自启动（可选）

> **注意**：此功能为可选项。如果您只是在开发环境测试，可以跳过此步骤，手动使用 `docker compose up -d` 启动服务即可。

#### 适用场景

- ✅ 生产服务器需要自动恢复服务
- ✅ 避免重启后手动启动的麻烦
- ✅ 需要统一的服务管理接口
- ❌ 开发测试环境（不推荐，避免意外占用资源）

#### 配置步骤

1. 创建 systemd 服务文件：

```bash
sudo nano /etc/systemd/system/firecrawl.service
```

2. 添加以下内容（**注意修改 WorkingDirectory 为实际路径**）：

```ini
[Unit]
Description=Firecrawl Self-Hosted Service
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/janex/Project/firecrawl-wsl
ExecStart=/usr/bin/docker compose -f docker-compose.yaml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.yaml down

[Install]
WantedBy=multi-user.target
```

3. 启用并启动服务：

```bash
# 重新加载 systemd 配置
sudo systemctl daemon-reload

# 启用开机自启
sudo systemctl enable firecrawl

# 启动服务
sudo systemctl start firecrawl

# 查看状态
sudo systemctl status firecrawl
```

#### 服务管理命令

```bash
# 启动服务
sudo systemctl start firecrawl

# 停止服务
sudo systemctl stop firecrawl

# 重启服务
sudo systemctl restart firecrawl

# 查看状态
sudo systemctl status firecrawl

# 查看日志
sudo journalctl -u firecrawl -f

# 禁用开机自启（保留服务文件）
sudo systemctl disable firecrawl

# 完全删除服务
sudo systemctl disable firecrawl
sudo systemctl stop firecrawl
sudo rm /etc/systemd/system/firecrawl.service
sudo systemctl daemon-reload
```

#### 验证自启动

```bash
# 测试重启后自动启动
sudo reboot

# 重启后检查服务状态
sudo systemctl status firecrawl
docker compose ps
```

### 3. 配置 Nginx 反向代理

安装 Nginx：

```bash
sudo apt update
sudo apt install nginx
```

创建配置文件：

```bash
sudo nano /etc/nginx/sites-available/firecrawl
```

添加配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/firecrawl /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. 配置防火墙

```bash
# 仅允许本地访问（推荐）
sudo ufw allow from 127.0.0.1 to any port 3002

# 或允许特定 IP
sudo ufw allow from YOUR_IP_ADDRESS to any port 3002

# 如果使用 Nginx
sudo ufw allow 'Nginx Full'
```

### 5. 配置 SSL/HTTPS（使用 Let's Encrypt）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

## 故障排查

### 问题 1: API 无响应

```bash
# 检查容器状态
docker compose ps

# 查看 API 日志
docker compose logs api --tail=50

# 重启 API 服务
docker compose restart api
```

### 问题 2: 搜索功能失败

**症状**: 返回 "No search results found"

**解决方法**:
```bash
# 1. 确认环境变量已设置
docker exec firecrawl-api-1 env | grep ALLOW_LOCAL_WEBHOOKS

# 2. 如果为 false，添加到 .env
echo "ALLOW_LOCAL_WEBHOOKS=true" >> .env

# 3. 重新启动服务（必须 down 后再 up）
docker compose down
docker compose up -d
```

### 问题 3: PostgreSQL 连接失败

```bash
# 检查数据库容器
docker compose ps nuq-postgres

# 查看数据库日志
docker compose logs nuq-postgres --tail=50

# 测试数据库连接
docker exec firecrawl-nuq-postgres-1 psql -U firecrawl -c "SELECT 1"

# 重启数据库
docker compose restart nuq-postgres
```

### 问题 4: Redis 连接问题

```bash
# 测试 Redis 连接
docker exec firecrawl-redis-1 redis-cli ping

# 应返回: PONG

# 重启 Redis
docker compose restart redis
```

### 问题 5: Playwright 服务内存不足

```bash
# 增加 Docker 内存限制
# 编辑 docker-compose.yaml，在 playwright-service 下添加:
# mem_limit: 2g

# 或减少并发数
# 编辑 .env:
BROWSER_POOL_SIZE=3
CRAWL_CONCURRENT_REQUESTS=5
```

### 问题 6: 端口冲突

```bash
# 检查端口占用
sudo lsof -i :3002

# 更改端口（编辑 .env）
PORT=3003

# 重启服务
docker compose down
docker compose up -d
```

## 常用管理命令

### 服务管理

```bash
# 启动服务
docker compose up -d

# 停止服务
docker compose down

# 重启服务
docker compose restart

# 重启特定服务
docker compose restart api

# 查看服务状态
docker compose ps

# 查看服务日志
docker compose logs -f

# 查看特定服务日志
docker compose logs -f api
```

### 数据管理

```bash
# 备份 PostgreSQL 数据
docker exec firecrawl-nuq-postgres-1 pg_dump -U firecrawl firecrawl > backup.sql

# 恢复数据
docker exec -i firecrawl-nuq-postgres-1 psql -U firecrawl firecrawl < backup.sql

# 查看 Docker 卷
docker volume ls | grep firecrawl

# 清理未使用的资源
docker system prune -a
```

### 监控和维护

```bash
# 查看资源使用
docker stats

# 查看特定容器资源使用
docker stats firecrawl-api-1

# 查看容器详情
docker inspect firecrawl-api-1

# 进入容器
docker exec -it firecrawl-api-1 bash
```

## 更新和升级

### 更新到最新版本

```bash
# 1. 拉取最新代码
cd /path/to/firecrawl
git pull origin main

# 2. 停止现有服务
docker compose down

# 3. 重新构建镜像
docker compose build

# 4. 启动服务
docker compose up -d

# 5. 验证更新
curl http://localhost:3002/
```

### 回滚到之前版本

```bash
# 1. 查看可用版本
git log --oneline

# 2. 回滚到特定版本
git checkout <commit-hash>

# 3. 重新构建并启动
docker compose down
docker compose build
docker compose up -d
```

## Python SDK 使用示例

安装 SDK：

```bash
pip install firecrawl-py
```

使用示例：

```python
from firecrawl import FirecrawlApp

# 连接到自托管实例
app = FirecrawlApp(api_url='http://localhost:3002')

# 抓取单页
scrape_result = app.scrape_url('https://example.com')
print(scrape_result['markdown'])

# 批量爬取
crawl_result = app.crawl_url(
    'https://example.com',
    params={'limit': 10}
)

# 搜索
search_result = app.search('Python programming')
for result in search_result:
    print(f"{result['title']}: {result['url']}")
```

## 安全建议

1. ✅ **不要将 `.env` 文件提交到版本控制**
   ```bash
   echo ".env" >> .gitignore
   ```

2. ✅ **定期更新镜像**
   ```bash
   docker compose pull
   docker compose up -d
   ```

3. ✅ **限制网络访问**
   - 仅允许必要的 IP 访问
   - 使用防火墙规则
   - 考虑使用 VPN

4. ✅ **监控资源使用**
   - 定期检查日志
   - 监控磁盘空间
   - 设置告警

5. ⚠️ **`ALLOW_LOCAL_WEBHOOKS=true` 安全警告**
   - 此设置会禁用 SSRF 防护
   - 仅在受信任的网络环境中使用
   - 生产环境建议使用外部搜索服务

## 相关资源

- 📚 [官方文档](https://docs.firecrawl.dev)
- 💻 [GitHub 仓库](https://github.com/mendableai/firecrawl)
- 🐛 [问题追踪](https://github.com/mendableai/firecrawl/issues)
- 💬 [社区讨论](https://github.com/mendableai/firecrawl/discussions)
- 📖 [API 参考](https://docs.firecrawl.dev/api-reference)

## 常见问题 FAQ

### Q: 需要 API 密钥吗？
**A**: 自托管版本默认关闭认证（`USE_DB_AUTHENTICATION=false`），无需 API 密钥。

### Q: 可以在生产环境使用吗？
**A**: 可以，但建议配置 Nginx 反向代理、SSL 证书和防火墙规则。

### Q: 如何扩展性能？
**A**: 调整 `.env` 中的并发参数，增加服务器资源，或使用 Docker Swarm/Kubernetes 部署。

### Q: 数据存储在哪里？
**A**: 数据存储在 Docker 卷中，可通过 `docker volume ls` 查看。

### Q: 支持哪些格式？
**A**: 支持 Markdown、HTML、原始 HTML 等多种输出格式。

---

**最后更新**: 2025-12-16  
**版本**: 1.0.0  
**维护者**: Firecrawl Community

如有问题或建议，欢迎提交 Issue 或 Pull Request！
