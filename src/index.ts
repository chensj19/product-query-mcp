import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode
} from '@modelcontextprotocol/sdk/types.js';
import { DatabaseService } from './database.js';
import { ProductQueryService } from './service.js';
import { z } from 'zod';

// 数据库配置必须通过环境变量提供
const DB_HOST = process.env.DB_HOST;
const DB_PORT = process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306;
const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;

// 验证必要的数据库配置
if (!DB_HOST || !DB_NAME || !DB_USER || !DB_PASSWORD) {
  console.error('错误: 数据库配置不完整');
  console.error('请设置以下环境变量:');
  console.error('  DB_HOST     - 数据库主机地址');
  console.error('  DB_PORT     - 数据库端口 (默认 3306)');
  console.error('  DB_NAME     - 数据库名称');
  console.error('  DB_USER     - 数据库用户名');
  console.error('  DB_PASSWORD - 数据库密码');
  process.exit(1);
}

// 初始化数据库服务和查询服务
const dbService = new DatabaseService({
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD
});

const queryService = new ProductQueryService(dbService);

// 创建 MCP Server
const server = new Server(
  {
    name: 'product-query-mcp',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Zod schema 定义（精简版）
const GetProductByCodeSchema = z.object({
  code: z.string().describe('产品编码，如 public-service, basic-service, finance-service')
});

const ListProductVersionsSchema = z.object({
  productId: z.string().describe('产品ID')
});

const ListIterationsSchema = z.object({
  productVersionId: z.string().describe('产品版本ID')
});

const ListIterationAppsSchema = z.object({
  iterationId: z.string().describe('迭代ID')
});

const ListAppSubModulesSchema = z.object({
  iterationId: z.string().describe('迭代ID'),
  appId: z.string().optional().describe('应用ID（可选）')
});

const ListVersionAppsSchema = z.object({
  versionId: z.string().describe('版本ID')
});

const ListVersionAppSubModulesSchema = z.object({
  versionId: z.string().describe('版本ID'),
  appId: z.string().optional().describe('应用ID（可选）')
});

const GenerateDownloadScriptSchema = z.object({
  iterationId: z.string().optional().describe('迭代ID（与versionId二选一）'),
  versionId: z.string().optional().describe('版本ID（无迭代时使用）'),
  appId: z.string().describe('应用ID')
}).refine(data => data.iterationId || data.versionId, {
  message: 'iterationId 和 versionId 必须提供一个'
});

// 注册工具列表（精简为 8 个核心工具）
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_product_by_code',
        description: '根据产品编码查询产品详情。常用编码: public-service(公共), basic-service(基础), finance-service(收费)',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: '产品编码' }
          },
          required: ['code']
        }
      },
      {
        name: 'list_product_versions',
        description: '查询产品下的版本列表。返回版本ID、名称、分支等信息。',
        inputSchema: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: '产品ID' }
          },
          required: ['productId']
        }
      },
      {
        name: 'list_iterations',
        description: '查询版本下的迭代列表。仅当用户明确要求查询迭代时使用。返回已发布的迭代（迭代ID、名称、状态、分支）。状态: 0初始化/1预发布/2已发布。',
        inputSchema: {
          type: 'object',
          properties: {
            productVersionId: { type: 'string', description: '产品版本ID' }
          },
          required: ['productVersionId']
        }
      },
      {
        name: 'list_version_apps',
        description: '查询版本下的应用列表（直接关联，不经过迭代）。返回版本关联的应用信息。',
        inputSchema: {
          type: 'object',
          properties: {
            versionId: { type: 'string', description: '版本ID' }
          },
          required: ['versionId']
        }
      },
      {
        name: 'list_version_app_submodules',
        description: '查询版本-应用下的子模块列表（开发态，不经过迭代）。返回子模块ID、分支、构建顺序。',
        inputSchema: {
          type: 'object',
          properties: {
            versionId: { type: 'string', description: '版本ID' },
            appId: { type: 'string', description: '应用ID（可选）' }
          },
          required: ['versionId']
        }
      },
      {
        name: 'list_iteration_apps',
        description: '查询迭代下的应用列表。仅当用户明确要求查询迭代应用时使用。返回迭代中实际发布的应用。',
        inputSchema: {
          type: 'object',
          properties: {
            iterationId: { type: 'string', description: '迭代ID' }
          },
          required: ['iterationId']
        }
      },
      {
        name: 'list_app_submodules',
        description: '查询迭代-应用下的子模块列表。返回子模块ID、分支、构建顺序。',
        inputSchema: {
          type: 'object',
          properties: {
            iterationId: { type: 'string', description: '迭代ID' },
            appId: { type: 'string', description: '应用ID（可选）' }
          },
          required: ['iterationId']
        }
      },
      {
        name: 'generate_download_script',
        description: '生成单个应用的子模块下载脚本。当提供versionId时，自动检测是否有已发布迭代：有迭代则用迭代态数据，无迭代则用开发态数据。返回bash脚本内容。',
        inputSchema: {
          type: 'object',
          properties: {
            versionId: { type: 'string', description: '版本ID' },
            iterationId: { type: 'string', description: '迭代ID（可选，明确指定时使用）' },
            appId: { type: 'string', description: '应用ID' }
          },
          required: ['appId']
        }
      },
      {
        name: 'generate_iteration_download_script',
        description: '生成迭代下所有应用的下载脚本。当用户需要"公版发布分支"、"最新发布迭代"、"所有Java应用"时使用。提供versionId会自动查找最新已发布迭代。返回完整bash脚本。',
        inputSchema: {
          type: 'object',
          properties: {
            versionId: { type: 'string', description: '版本ID（自动查找最新已发布迭代）' },
            iterationId: { type: 'string', description: '迭代ID（可选）' },
            appType: { type: 'string', description: '应用类型筛选（默认WINNING_MS即Java应用）' }
          }
        }
      },
      {
        name: 'list_products',
        description: '查询所有产品列表。返回所有产品的基本信息。',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'query_chain',
        description: '全链路查询：产品→版本→迭代→应用→子模块。一次性获取完整层级结构。',
        inputSchema: {
          type: 'object',
          properties: {
            productCode: { type: 'string', description: '产品编码（可选，如 public-service）' },
            versionId: { type: 'string', description: '版本ID（可选）' },
            iterationId: { type: 'string', description: '迭代ID（可选）' }
          }
        }
      }
    ]
  };
});

// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: any;

    switch (name) {
      case 'list_products':
        result = await queryService.listProducts();
        break;

      case 'get_product_by_code': {
        const parsedArgs = GetProductByCodeSchema.parse(args);
        result = await queryService.getProductByCode(parsedArgs.code);
        if (!result) {
          throw new McpError(ErrorCode.InvalidRequest, `产品不存在: ${parsedArgs.code}\n可用编码: public-service, basic-service, finance-service`);
        }
        break;
      }

      case 'list_product_versions':
        result = await queryService.listProductVersions(ListProductVersionsSchema.parse(args));
        break;

      case 'list_iterations':
        result = await queryService.listIterations(ListIterationsSchema.parse(args));
        break;

      case 'list_iteration_apps':
        result = await queryService.listIterationApps(ListIterationAppsSchema.parse(args));
        break;

      case 'list_version_apps':
        result = await queryService.listVersionApps(ListVersionAppsSchema.parse(args));
        break;

      case 'list_version_app_submodules':
        result = await queryService.listAppDevSubModules(ListVersionAppSubModulesSchema.parse(args));
        break;

      case 'list_app_submodules':
        result = await queryService.listAppSubModules(ListAppSubModulesSchema.parse(args));
        break;

      case 'generate_download_script': {
        const parsedArgs = GenerateDownloadScriptSchema.parse(args);
        result = await queryService.generateDownloadScript(parsedArgs.appId, {
          iterationId: parsedArgs.iterationId,
          versionId: parsedArgs.versionId
        });
        return {
          content: [{ type: 'text', text: result }]
        };
      }

      case 'generate_iteration_download_script': {
        const versionId = args?.versionId as string | undefined;
        const iterationId = args?.iterationId as string | undefined;
        const appType = args?.appType as string | undefined;

        if (!versionId && !iterationId) {
          throw new McpError(ErrorCode.InvalidParams, '必须提供 versionId 或 iterationId');
        }

        result = await queryService.generateIterationDownloadScript({
          versionId,
          iterationId,
          appType
        });
        return {
          content: [{ type: 'text', text: result }]
        };
      }

      case 'query_chain': {
        const productCode = args?.productCode as string | undefined;
        const versionId = args?.versionId as string | undefined;
        const iterationId = args?.iterationId as string | undefined;

        if (productCode) {
          const product = await queryService.getProductByCode(productCode);
          if (!product) {
            throw new McpError(ErrorCode.InvalidRequest, `产品不存在: ${productCode}`);
          }
          const productId = (product as any).PRODUCT_ID;
          const versions = await queryService.listProductVersions({ productId });

          result = {
            product: product,
            versions: versions,
            iterations: [],
            apps: [],
            subModules: []
          };

          if (versionId) {
            const iterations = await queryService.listIterations({ productVersionId: versionId });
            result.iterations = iterations;

            if (iterationId) {
              // 迭代态：产品 → 版本 → 迭代 → 应用 → 子模块
              const apps = await queryService.listIterationApps({ iterationId });
              result.apps = apps;

              try {
                result.subModules = await queryService.listAppSubModules({ iterationId });
              } catch (e) {
                result.subModules = [];
              }
            } else {
              // 开发态：产品 → 版本 → 应用 → 子模块
              try {
                result.apps = await queryService.listVersionApps({ versionId });
                result.subModules = await queryService.listAppDevSubModules({ versionId });
              } catch (e) {
                // 查询失败，保持空数组
              }
            }
          } else if (versions.length > 0) {
            const firstVersionId = (versions[0] as any).VERSION_ID;
            const iterations = await queryService.listIterations({ productVersionId: firstVersionId });
            result.iterations = iterations;
          }
        } else {
          result = await queryService.listProducts();
        }
        break;
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `未知工具: ${name}`);
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    if (error instanceof z.ZodError) {
      throw new McpError(ErrorCode.InvalidParams, '参数验证失败');
    }
    const errMsg = (error as Error).message;
    if (errMsg.includes('ECONNREFUSED') || errMsg.includes('ETIMEDOUT') || errMsg.includes('Access denied')) {
      throw new McpError(ErrorCode.InternalError, '数据库连接失败');
    }
    throw new McpError(ErrorCode.InternalError, '查询失败');
  }
});

// 启动服务器
async function main() {
  const connTest = await dbService.testConnection();
  if (!connTest.success) {
    console.error(connTest.message);
  } else {
    console.error('Product Query MCP Server started - Database connected');
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

process.on('SIGINT', async () => {
  await dbService.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await dbService.close();
  process.exit(0);
});

main().catch((error) => {
  console.error('Server error:', error.message);
  process.exit(1);
});