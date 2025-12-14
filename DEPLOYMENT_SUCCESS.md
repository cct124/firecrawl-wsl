# 🎉 Firecrawl 自托管服务部署成功！

## ✅ 当前服务状态

所有服务已成功启动并运行：

- **Firecrawl API**: http://localhost:3002 ✅
- **PostgreSQL**: 端口 5432 ✅  
- **Redis**: 端口 6379 ✅
- **Playwright 服务**: 内部端口 3000 ✅

## 🚀 快速测试

### 1. 检查 API 状态
```bash
curl http://localhost:3002/
```

预期输出：
```json
{"message":"Firecrawl API","documentation_url":"https://docs.firecrawl.dev"}
```

### 2. 测试网页抓取
```bash
curl -X POST http://localhost:3002/v0/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

## 📖 API 使用说明

### 抓取单个网页
```bash
curl -X POST http://localhost:3002/v0/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "formats": ["markdown", "html"]
  }'
```

### 批量爬取网站
```bash
curl -X POST http://localhost:3002/v0/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "limit": 10,
    "scrapeOptions": {
      "formats": ["markdown"]
    }
  }'
```

### 检查爬取状态
```bash
curl http://localhost:3002/v0/crawl/status/{jobId}
```

## 🐍 Python 示例

```python
import requests

# 抓取单页
response = requests.post(
    "http://localhost:3002/v0/scrape",
    json={"url": "https://example.com"}
)
data = response.json()
print(data["data"]["markdown"])

# 批量爬取
response = requests.post(
    "http://localhost:3002/v0/crawl",
    json={
        "url": "https://example.com",
        "limit": 10
    }
)
job_id = response.json()["id"]
print(f"爬取任务 ID: {job_id}")
```

## 📦 服务管理

### 查看所有服务状态
```bash
sudo docker compose -f /home/janex/firecrawl/docker-compose.yaml ps
```

### 查看服务日志
```bash
# 所有服务
sudo docker compose -f /home/janex/firecrawl/docker-compose.yaml logs -f

# 特定服务
sudo docker compose -f /home/janex/firecrawl/docker-compose.yaml logs -f api
```

### 重启服务
```bash
sudo docker compose -f /home/janex/firecrawl/docker-compose.yaml restart api
```

### 停止所有服务
```bash
sudo docker compose -f /home/janex/firecrawl/docker-compose.yaml down
```

### 启动所有服务
```bash
sudo docker compose -f /home/janex/firecrawl/docker-compose.yaml up -d
```

## ⚙️ 配置说明

### 环境变量文件
配置文件位于：`/home/janex/firecrawl/.env`

主要配置：
- `PORT=3002` - API 端口
- `NUM_WORKERS_PER_QUEUE=8` - Worker 数量
- `CRAWL_CONCURRENT_REQUESTS=10` - 并发爬取数
- `USE_DB_AUTHENTICATION=false` - 关闭数据库认证（自托管）

### 性能调优
修改 `.env` 文件中的参数：
```bash
# 增加并发数（适用于高配置服务器）
CRAWL_CONCURRENT_REQUESTS=20
MAX_CONCURRENT_JOBS=10
BROWSER_POOL_SIZE=10
NUM_WORKERS_PER_QUEUE=16
```

## 🔧 故障排查

### API 无响应
```bash
# 检查服务状态
sudo docker ps | grep firecrawl

# 查看 API 日志
sudo docker logs firecrawl-api-1 --tail=50
```

### PostgreSQL 连接失败
```bash
# 重启数据库
sudo docker compose -f /home/janex/firecrawl/docker-compose.yaml restart nuq-postgres

# 检查数据库连接
sudo docker exec firecrawl-nuq-postgres-1 psql -U firecrawl -c "SELECT 1"
```

### Redis 连接问题
```bash
# 测试 Redis
sudo docker exec firecrawl-redis-1 redis-cli ping
```

## 📊 监控和维护

### 查看资源使用
```bash
sudo docker stats firecrawl-api-1
```

### 清理旧容器和镜像
```bash
sudo docker system prune -a
```

### 数据备份
数据存储位置：
- PostgreSQL 数据：Docker volume `firecrawl_nuq-postgres-data`
- Redis 数据：Docker volume (自动管理)

## 🌐 生产环境建议

### 1. 使用 Nginx 反向代理
已提供配置文件：`/home/janex/firecrawl/nginx.conf`

### 2. 配置防火墙
```bash
# 只允许本地访问
sudo ufw allow from 127.0.0.1 to any port 3002

# 或允许特定 IP
sudo ufw allow from YOUR_IP to any port 3002
```

### 3. 设置开机自启动
```bash
# 创建 systemd 服务
sudo nano /etc/systemd/system/firecrawl.service
```

内容：
```ini
[Unit]
Description=Firecrawl Service
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/janex/firecrawl
ExecStart=/usr/bin/docker compose -f docker-compose.yaml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.yaml down

[Install]
WantedBy=multi-user.target
```

启用服务：
```bash
sudo systemctl enable firecrawl
sudo systemctl start firecrawl
```

## 📝 注意事项

1. ✅ **无需 API 密钥** - 自托管版本已关闭认证
2. ✅ **数据完全本地** - 所有数据存储在本地数据库
3. ⚠️ **资源使用** - Playwright 服务占用较多内存（建议至少 4GB RAM）
4. ⚠️ **更新** - 定期拉取最新镜像：`sudo docker compose pull`

## 🔗 相关资源

- 官方文档: https://docs.firecrawl.dev
- GitHub: https://github.com/mendableai/firecrawl
- API 参考: https://docs.firecrawl.dev/api-reference

---

**部署完成时间**: 2025-12-14
**服务地址**: http://localhost:3002
**状态**: ✅ 运行正常
