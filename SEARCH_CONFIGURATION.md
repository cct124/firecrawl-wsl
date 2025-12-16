# 🔍 Firecrawl 搜索功能配置指南

## 📊 当前状态

✅ **Scrape（网页抓取）**: 正常工作  
✅ **Crawl（批量爬取）**: 正常工作  
✅ **Search（搜索）**: 正常工作

## ⚠️ 问题说明（已解决）

~~搜索功能依赖外部搜索引擎，在 WSL2/Docker 环境中可能遇到网络限制：~~
~~- DuckDuckGo（默认）: ❌ 被安全规则阻止~~

**问题已解决！** 通过修改环境变量配置，DuckDuckGo 搜索功能现已正常工作。

## 🔧 解决方案

### 启用 DuckDuckGo 搜索

问题根源：Firecrawl 的安全检查机制阻止了对某些 IP 地址的连接，导致 DuckDuckGo 搜索被拒绝。

#### 修复步骤：

1. 编辑环境变量文件：
```bash
nano /home/janex/Project/firecrawl-wsl/.env
```

2. 添加以下配置：
```env
ALLOW_LOCAL_WEBHOOKS=true
```

3. 重启服务使配置生效：
```bash
sudo docker compose -f /home/janex/Project/firecrawl-wsl/docker-compose.yaml down
sudo docker compose -f /home/janex/Project/firecrawl-wsl/docker-compose.yaml up -d
```

**注意**：使用 `restart` 命令无法加载新的环境变量，必须先 `down` 再 `up -d`。

## 📝 测试搜索功能

配置完成后测试：

```bash
# 测试搜索功能
curl -X POST http://localhost:3002/v0/search \
  -H "Content-Type: application/json" \
  -d '{"query":"Python programming","limit":3}'
```

预期输出：返回包含搜索结果的 JSON 数据，包括 URL、标题、描述和完整网页内容。

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

## 💡 技术说明

### 问题原因

Firecrawl 使用 `safeFetch` 安全机制来防止访问私有 IP 地址，避免 SSRF（服务器端请求伪造）攻击。默认情况下，这个安全检查会阻止某些被误判为私有地址的连接，导致 DuckDuckGo 搜索失败。

### 解决原理

设置 `ALLOW_LOCAL_WEBHOOKS=true` 会禁用私有 IP 检查，允许所有网络连接通过，从而解决 DuckDuckGo 被阻止的问题。

**安全提示**：此配置会降低 SSRF 防护级别，仅建议在本地开发或受信任的网络环境中使用。

## 🔗 相关资源

- Firecrawl 文档: https://docs.firecrawl.dev/features/search
- GitHub 仓库: https://github.com/mendableai/firecrawl

---

**最后更新**: 2025-12-16  
**状态**: ✅ 所有功能正常工作
