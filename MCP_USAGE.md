# Firecrawl MCP 使用说明

## 什么是 MCP？

MCP (Model Context Protocol) 是一个协议，允许 AI 助手（如 Claude Desktop）通过标准接口调用外部工具和服务。

## 配置自托管 Firecrawl MCP

### 1. 确保 Firecrawl 服务运行

```bash
cd /home/janex/Project/firecrawl-wsl
docker compose ps

# 应看到 api 服务在 localhost:3002 运行
```

### 2. 配置 Claude Desktop

编辑 Claude Desktop 配置文件：

**macOS/Linux**:
```bash
~/.config/Claude/claude_desktop_config.json
```

**Windows**:
```
%APPDATA%\Claude\claude_desktop_config.json
```

添加以下配置：

```json
{
  "mcpServers": {
    "firecrawl-mcp": {
      "command": "npx",
      "args": ["-y", "firecrawl-mcp"],
      "env": {
        "FIRECRAWL_API_URL": "http://localhost:3002"
      }
    }
  }
}
```

⚠️ **注意**：`FIRECRAWL_API_URL` 必须包含完整的协议（`http://`），不能只写 `localhost:3002`。

### 3. 重启 Claude Desktop

关闭并重新打开 Claude Desktop 应用，MCP 服务器会自动连接。

### 4. 验证连接

在 Claude Desktop 中，您应该能看到 Firecrawl 工具可用。可以尝试：

```
"抓取 https://example.com 的内容"
"爬取 https://news.ycombinator.com 的前 5 个链接"
"搜索 Python 教程"
```

## 可用功能

通过 MCP，Claude 可以调用以下 Firecrawl 功能：

- 🔍 **scrape** - 抓取单个网页内容
- 🕷️ **crawl** - 批量爬取网站链接
- 🔎 **search** - 使用 DuckDuckGo 搜索网页

## 故障排查

### 问题：连接失败

```bash
# 1. 检查 Firecrawl 服务状态
curl http://localhost:3002/

# 2. 检查 Claude Desktop 日志（macOS）
tail -f ~/Library/Logs/Claude/mcp*.log
```

### 问题：API URL 错误

确保配置文件中的 URL 格式正确：
- ✅ `http://localhost:3002`
- ✅ `http://127.0.0.1:3002`
- ❌ `localhost:3002`（缺少协议）
- ❌ `https://localhost:3002`（除非配置了 SSL）

### 问题：npx 未找到

```bash
# 安装 Node.js 和 npm
# Ubuntu/Debian
sudo apt install nodejs npm

# macOS
brew install node

# 验证安装
npx --version
```

## 远程访问配置

如果需要从其他机器访问自托管服务：

### 1. 使用 SSH 隧道

```bash
# 在本地机器上执行
ssh -L 3002:localhost:3002 user@your-server

# 然后 MCP 配置保持不变
```

### 2. 配置 Nginx 反向代理

参考 [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) 中的 Nginx 配置，然后修改 MCP 配置：

```json
{
  "mcpServers": {
    "firecrawl-mcp": {
      "command": "npx",
      "args": ["-y", "firecrawl-mcp"],
      "env": {
        "FIRECRAWL_API_URL": "https://your-domain.com"
      }
    }
  }
}
```

## 使用示例

配置完成后，在 Claude Desktop 中可以直接使用自然语言：

**示例 1：抓取网页**
```
用户：抓取 https://example.com 并总结内容
Claude：[自动调用 scrape API] 这个网站是...
```

**示例 2：批量爬取**
```
用户：爬取 https://docs.python.org 的前 10 页文档
Claude：[自动调用 crawl API] 开始爬取...
```

**示例 3：搜索**
```
用户：搜索最新的 AI 新闻
Claude：[自动调用 search API] 找到以下结果...
```

## 相关资源

- 📖 [Firecrawl 部署指南](DEPLOYMENT_GUIDE.md)
- 🔧 [搜索功能配置](SEARCH_CONFIGURATION.md)
- 💻 [MCP 官方文档](https://modelcontextprotocol.io/)
- 🐛 [Firecrawl MCP GitHub](https://github.com/mendableai/firecrawl-mcp)

---

**最后更新**: 2025-12-16
