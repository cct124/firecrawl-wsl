# 🔍 Firecrawl 搜索功能配置指南

## 📊 当前状态

✅ **Scrape（网页抓取）**: 正常工作  
✅ **Crawl（批量爬取）**: 正常工作  
❌ **Search（搜索）**: 不可用 - DuckDuckGo 被网络规则阻止

## ⚠️ 问题说明

搜索功能依赖外部搜索引擎，在 WSL2/Docker 环境中可能遇到网络限制：
- DuckDuckGo（默认）: ❌ 被安全规则阻止
- 需要配置其他搜索源

## 🔧 解决方案

### 方案 1: 使用 SearchAPI（推荐）

SearchAPI 是一个付费的搜索聚合服务，支持多个搜索引擎。

#### 步骤：
1. 访问 https://searchapi.com/ 注册账号
2. 获取 API 密钥
3. 配置环境变量：

```bash
# 编辑 .env 文件
nano /home/janex/firecrawl/.env
```

添加：
```env
SEARCHAPI_API_KEY=your-api-key-here
SEARCHAPI_ENGINE=google  # 可选: google, bing, baidu 等
```

4. 重启服务：
```bash
sudo docker compose -f /home/janex/firecrawl/docker-compose.yaml restart api
```

### 方案 2: 使用 SearXNG（免费，自托管）

SearXNG 是一个开源的元搜索引擎。

#### 快速部署 SearXNG：

```bash
# 1. 创建 SearXNG 容器
sudo docker run -d \
  --name searxng \
  --network firecrawl_backend \
  -p 8080:8080 \
  -e BASE_URL=http://localhost:8080 \
  searxng/searxng:latest

# 2. 配置 Firecrawl 使用 SearXNG
# 编辑 .env 添加：
echo "SEARXNG_ENDPOINT=http://searxng:8080" >> /home/janex/firecrawl/.env

# 3. 重启 Firecrawl
sudo docker compose -f /home/janex/firecrawl/docker-compose.yaml restart api
```

访问 SearXNG: http://localhost:8080

### 方案 3: 禁用搜索功能

如果不需要搜索功能，可以继续使用 Scrape 和 Crawl：

```bash
# 搜索功能是可选的，不影响核心功能
# Scrape 和 Crawl 功能完全正常
```

## 📝 测试搜索功能

配置完成后测试：

```bash
# 使用 SearchAPI
curl -X POST http://localhost:3002/v0/search \
  -H "Content-Type: application/json" \
  -d '{"query":"Python programming"}'

# 使用 SearXNG
curl -X POST http://localhost:3002/v0/search \
  -H "Content-Type: application/json" \
  -d '{
    "query":"Python tutorial",
    "limit": 5
  }'
```

## 🎯 核心功能验证

以下功能**已经正常工作**，无需搜索配置：

### ✅ Scrape（网页抓取）
```bash
curl -X POST http://localhost:3002/v0/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

### ✅ Crawl（批量爬取）
```bash
curl -X POST http://localhost:3002/v0/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "url":"https://example.com",
    "limit": 10
  }'
```

## 💡 推荐配置

对于大多数用户：
1. **仅需网页抓取/爬取**: 无需配置搜索，现有功能完全可用 ✅
2. **需要搜索功能**: 推荐使用 SearXNG（免费自托管）
3. **企业用户**: 使用 SearchAPI（稳定可靠）

## 🔗 相关链接

- SearchAPI: https://searchapi.com/
- SearXNG 文档: https://docs.searxng.org/
- Firecrawl 文档: https://docs.firecrawl.dev/features/search

---

**最后更新**: 2025-12-14  
**状态**: 核心功能正常，搜索需要额外配置
