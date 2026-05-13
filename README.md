# Product Query MCP Server

基于 Node.js 的 MCP 服务，用于查询产品中心的产品-版本-迭代-应用-子模块链路数据。

## 简介

Product Query MCP 是一个专为产品研发管理设计的智能查询工具，通过 MCP 协议与 Claude 等AI助手无缝集成。它打通了产品中心数据库的完整数据链路，让用户可以通过自然语言快速获取产品发布信息、版本迭代详情、应用构建配置等关键数据。

### 核心功能

**一站式产品链路查询**：支持从产品到子模块的五级数据穿透查询，清晰呈现产品的完整发布历史和结构组成。

**智能下载脚本生成**：一键生成符合规范的子模块下载脚本，自动识别迭代态和开发态数据，支持批量生成整个迭代的全部应用下载脚本。

**版本迭代追踪**：快速定位产品版本及其发布的迭代，支持按迭代状态筛选（初始化、预发布、已发布），便于追踪发布进度。

**应用构建分析**：查询应用下的所有子模块，获取分支信息、构建顺序等关键配置，为代码分析和技术调研提供数据支撑。

**全链路聚合查询**：`query_chain` 工具一次性返回产品→版本→迭代→应用→子模块的完整层级结构，减少多次调用的繁琐。

### 适用场景

- 产品经理查询产品版本发布情况
- 开发人员获取应用构建配置和分支信息
- 测试人员追踪迭代发布进度
- 技术调研时批量下载产品代码模块

## 工具列表

| 工具名称 | 说明 |
|----------|------|
| `list_products` | 查询所有产品列表 |
| `get_product_by_code` | 根据产品编码查询详情 |
| `list_product_versions` | 查询产品下的版本列表 |
| `list_iterations` | 查询版本下的迭代列表 |
| `list_iteration_apps` | 查询迭代下的应用列表 |
| `list_app_submodules` | 查询迭代-应用下的子模块 |
| `generate_download_script` | 生成子模块下载脚本 |
| `query_chain` | 全链路查询 |

## 安装与构建

```bash
# 安装依赖
npm install

# 构建
npm run build

# 开发模式运行
npm run dev
```

## 配置说明

### 必需的环境变量

数据库配置必须通过环境变量提供：

```bash
DB_HOST=your-host
DB_PORT=3306
DB_NAME=your-database
DB_USER=your-user
DB_PASSWORD=your-password
```

或在 MCP 客户端配置中设置：

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

## 使用示例

### 查询公共服务的迭代

```
1. get_product_by_code("public-service") → 获取产品ID
2. list_product_versions(productId) → 获取版本列表
3. list_iterations(versionId) → 获取迭代列表
```

### 全链路查询

```
query_chain({ productCode: "public-service" })
```

### 生成下载脚本

```
generate_download_script({ iterationId: "xxx", appId: "yyy" })
```

## 常用产品编码

| 编码 | 产品名称 |
|------|----------|
| public-service | 公共 |
| basic-service | 基础 |
| finance-service | 收费 |


## 数据结构

```
产品 (mcp_product)
    │ product_id
    ▼
版本 (mcp_pversion)
    │ VERSION_ID
    ▼
迭代 (mcp_base_version)  ← 状态: 0初始化/1预发布/2已发布
    │ id
    ▼
迭代应用 (mcp_iteration_app)
    │ id_app
    ▼
子模块 (mcp_iteration_app_submodule_mapping)
```
