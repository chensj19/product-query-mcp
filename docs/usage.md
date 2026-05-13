# Product Query MCP 使用说明

## 简介

Product Query MCP 是一个用于查询产品中心数据链路的 MCP 服务，支持查询产品、版本、迭代、应用、子模块等信息。

## 安装配置

### 1. 克隆仓库

```bash
git clone https://github.com/chensj19/product-query-mcp.git
cd product-query-mcp
npm install
npm run build
```

### 2. 配置数据库连接

**必须**设置以下环境变量：

| 变量 | 说明 | 示例 |
|------|------|------|
| `DB_HOST` | 数据库主机 | `your-db-host` |
| `DB_PORT` | 数据库端口 | `3306` |
| `DB_NAME` | 数据库名 | `your-database` |
| `DB_USER` | 用户名 | `your-user` |
| `DB_PASSWORD` | 密码 | `your-password` |

### 3. 配置 MCP 客户端

在 Claude Desktop 或其他 MCP 客户端的配置文件中添加：

```json
{
  "mcpServers": {
    "product-query": {
      "command": "node",
      "args": ["path/to/product-query-mcp/dist/index.js"],
      "env": {
        "DB_HOST": "your-host",
        "DB_PORT": "3306",
        "DB_NAME": "your-database",
        "DB_USER": "your-user",
        "DB_PASSWORD": "your-password"
      }
    }
  }
}
```

## 可用工具

| 工具 | 用途 |
|------|------|
| `list_products` | 查询所有产品 |
| `get_product_by_code` | 根据编码查产品详情 |
| `list_product_versions` | 查询产品版本列表 |
| `list_iterations` | 查询版本迭代列表 |
| `list_iteration_apps` | 查询迭代应用列表 |
| `list_app_submodules` | 查询应用子模块 |
| `generate_download_script` | 生成下载脚本 |
| `query_chain` | 全链路查询 |

## 常用产品编码

- `public-service` - 公共
- `basic-service` - 基础
- `finance-service` - 收费

## 快速查询示例

### 查询产品的完整信息链路

```
query_chain({ productCode: "public-service" })
```

### 生成应用的下载脚本

```
generate_download_script({ versionId: "xxx", appId: "yyy" })
```