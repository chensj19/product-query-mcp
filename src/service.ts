import { writeFileSync } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { DatabaseService } from './database.js';
import {
  Product,
  ProductVersion,
  BaseVersion,
  ProductVersionIterationApp,
  IterationAppSubModuleMapping,
  ProductVersionRelease,
  App,
  AppSubModuleMapping,
  QueryProductsParams,
  QueryVersionsParams,
  QueryIterationsParams,
  QueryAppsParams,
  QuerySubModulesParams,
  QueryFullChainParams,
  QueryVersionAppsParams,
  QueryAppSubModulesParams,
  FullChainResult,
  FullChainResultV2
} from './types.js';
import { RowDataPacket } from 'mysql2/promise';

/**
 * 产品查询服务
 */
export class ProductQueryService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  /**
   * 查询产品列表
   */
  async listProducts(params?: QueryProductsParams): Promise<Product[]> {
    let sql = 'SELECT * FROM mcp_product WHERE 1=1';
    const conditions: string[] = [];
    const values: any[] = [];

    if (params?.whereClause) {
      conditions.push(params.whereClause);
    }

    if (conditions.length > 0) {
      sql += ' AND ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY no ASC, name ASC';

    try {
      const rows = await this.db.query<RowDataPacket[]>(sql, values);
      return rows as Product[];
    } catch (error: any) {
      throw new Error('产品查询失败');
    }
  }

  /**
   * 根据产品ID查询产品
   */
  async getProductById(productId: string): Promise<Product | null> {
    const sql = 'SELECT * FROM mcp_product WHERE product_id = ?';
    try {
      const rows = await this.db.query<RowDataPacket[]>(sql, [productId]);
      return rows.length > 0 ? rows[0] as Product : null;
    } catch (error: any) {
      throw new Error('产品查询失败');
    }
  }

  /**
   * 根据产品编码查询产品
   */
  async getProductByCode(code: string): Promise<Product | null> {
    const sql = 'SELECT * FROM mcp_product WHERE code = ?';
    try {
      const rows = await this.db.query<RowDataPacket[]>(sql, [code]);
      return rows.length > 0 ? rows[0] as Product : null;
    } catch (error: any) {
      console.error('产品查询失败，原始错误:', error.message);
      throw new Error('产品查询失败: ' + error.message);
    }
  }

  /**
   * 查询产品下的版本列表
   */
  async listProductVersions(params: QueryVersionsParams): Promise<ProductVersion[]> {
    const sql = "SELECT VERSION_ID, PRODUCT_ID, NAME, pv_branch, deploy_mode FROM mcp_pversion WHERE PRODUCT_ID = ? ORDER BY CREATE_TIME DESC";
    try {
      const rows = await this.db.query<RowDataPacket[]>(sql, [params.productId]);
      return rows as ProductVersion[];
    } catch (error: any) {
      throw new Error('版本查询失败');
    }
  }

  /**
   * 根据版本ID查询版本
   */
  async getVersionById(versionId: string): Promise<ProductVersion | null> {
    const sql = "SELECT VERSION_ID, PRODUCT_ID, NAME, pv_branch, deploy_mode FROM mcp_pversion WHERE VERSION_ID = ?";
    try {
      const rows = await this.db.query<RowDataPacket[]>(sql, [versionId]);
      return rows.length > 0 ? rows[0] as ProductVersion : null;
    } catch (error: any) {
      throw new Error('版本查询失败');
    }
  }

  /**
   * 查询版本下的迭代列表
   */
  async listIterations(params: QueryIterationsParams): Promise<BaseVersion[]> {
    const sql = "SELECT id, id_pvreleaseid, name, iteration_status, iteration_branch FROM mcp_base_version WHERE id_pvreleaseid = ? AND launch_flag = 2 ORDER BY createtime DESC";
    try {
      const rows = await this.db.query<RowDataPacket[]>(sql, [params.productVersionId]);
      return rows as BaseVersion[];
    } catch (error: any) {
      throw new Error('迭代查询失败');
    }
  }

  /**
   * 根据迭代ID查询迭代
   */
  async getIterationById(iterationId: string): Promise<BaseVersion | null> {
    const sql = "SELECT id, id_pvreleaseid, name, iteration_status, iteration_branch FROM mcp_base_version WHERE id = ?";
    try {
      const rows = await this.db.query<RowDataPacket[]>(sql, [iterationId]);
      return rows.length > 0 ? rows[0] as BaseVersion : null;
    } catch (error: any) {
      throw new Error('迭代查询失败');
    }
  }

  /**
   * 查询迭代下的应用列表
   */
  async listIterationApps(params: QueryAppsParams): Promise<ProductVersionIterationApp[]> {
    const sql = "SELECT ia.id, ia.iteration_id, ia.id_app, ia.app_label, ia.app_mode, ia.enabled, a.DESCRIPTION, a.manager, a.APP_TYPE FROM mcp_iteration_app ia LEFT JOIN MCP_APP a ON ia.id_app = a.ID WHERE ia.iteration_id = ? ORDER BY ia.app_label ASC";
    try {
      const rows = await this.db.query<RowDataPacket[]>(sql, [params.iterationId]);
      return rows as ProductVersionIterationApp[];
    } catch (error: any) {
      throw new Error('应用查询失败');
    }
  }

  /**
   * 查询迭代-应用下的子模块列表
   */
  async listAppSubModules(params: QuerySubModulesParams): Promise<IterationAppSubModuleMapping[]> {
    let sql = "SELECT m.id, m.iteration_id, m.product_app_id, m.sub_app_id, m.branch, m.build_sort, sub.LABEL as sub_app_code, sub.DESCRIPTION as sub_app_name FROM mcp_iteration_app_submodule_mapping m LEFT JOIN MCP_APP sub ON m.sub_app_id = sub.ID WHERE m.iteration_id = ?";
    const values: any[] = [params.iterationId];
    if (params.appId) {
      sql += " AND m.product_app_id = ?";
      values.push(params.appId);
    }
    sql += " ORDER BY m.build_sort ASC";
    try {
      const rows = await this.db.query<RowDataPacket[]>(sql, values);
      return rows as IterationAppSubModuleMapping[];
    } catch (error: any) {
      throw new Error('子模块查询失败');
    }
  }

  /**
   * 全链路查询：一次性获取完整的层级结构
   */
  async queryFullChain(params: QueryFullChainParams): Promise<FullChainResult> {
    const result: FullChainResult = {};

    // 1. 查询产品
    if (params.productId) {
      const product = await this.getProductById(params.productId);
      result.products = product ? [product] : [];
    } else {
      result.products = await this.listProducts();
    }

    // 2. 查询版本
    if (params.versionId) {
      const version = await this.getVersionById(params.versionId);
      result.versions = version ? [version] : [];
    } else if (params.productId) {
      result.versions = await this.listProductVersions({ productId: params.productId });
    }

    // 3. 查询迭代
    if (params.iterationId) {
      const iteration = await this.getIterationById(params.iterationId);
      result.iterations = iteration ? [iteration] : [];
    } else if (params.versionId) {
      result.iterations = await this.listIterations({ productVersionId: params.versionId });
    } else if (result.versions && result.versions.length > 0) {
      const iterations: BaseVersion[] = [];
      for (const version of result.versions) {
        const versionId = (version as any).VERSION_ID;
        if (versionId) {
          const iters = await this.listIterations({ productVersionId: versionId });
          iterations.push(...iters);
        }
      }
      result.iterations = iterations;
    }

    // 4. 查询应用
    if (params.iterationId) {
      result.apps = await this.listIterationApps({ iterationId: params.iterationId });
    } else if (result.iterations && result.iterations.length > 0) {
      const apps: ProductVersionIterationApp[] = [];
      for (const iteration of result.iterations) {
        const iterId = (iteration as any).id;
        if (iterId) {
          const appList = await this.listIterationApps({ iterationId: iterId });
          apps.push(...appList);
        }
      }
      result.apps = apps;
    }

    // 5. 查询子模块
    if (params.iterationId) {
      result.subModules = await this.listAppSubModules({ iterationId: params.iterationId, appId: params.appId });
    } else if (result.iterations && result.iterations.length > 0) {
      const subModules: IterationAppSubModuleMapping[] = [];
      for (const iteration of result.iterations) {
        const iterId = (iteration as any).id;
        if (iterId) {
          const modules = await this.listAppSubModules({ iterationId: iterId });
          subModules.push(...modules);
        }
      }
      result.subModules = subModules;
    }

    return result;
  }

  /**
   * 获取迭代状态描述
   */
  getIterationStatusDesc(status: number): string {
    switch (status) {
      case 0:
        return '初始化';
      case 1:
        return '预发布';
      case 2:
        return '已发布';
      default:
        return '未知';
    }
  }

  /**
   * 获取应用模式描述
   */
  getAppModeDesc(mode: string): string {
    const modeMap: Record<string, string> = {
      'aaio': 'PBC服务',
      'whole': '整体部署',
      'wholemain': '整体部署-main',
      'integration': '组合部署',
      'wdsfhir': 'HIS微服务',
      'tmts': 'TMTS服务',
      'database': '数据库',
      'test': '自动化测试',
      'neo4j': '图数据库',
      'other': '其他'
    };
    return modeMap[mode] || mode;
  }

  // ========== 第二条链路: 产品-版本-应用-子模块 ==========

  /**
   * 查询版本下的应用列表 (开发态)
   * 表: mcp_version_release
   */
  async listVersionApps(params: QueryVersionAppsParams): Promise<ProductVersionRelease[]> {
    const sql = "SELECT vr.VERSION_RELEASE_ID, vr.VERSION_ID, vr.id_app, vr.type, vr.app_mode, vr.enabled, a.LABEL, a.DESCRIPTION, a.APP_TYPE, a.manager FROM mcp_version_release vr LEFT JOIN MCP_APP a ON vr.id_app = a.ID WHERE vr.VERSION_ID = ? ORDER BY a.APP_TYPE DESC, vr.type ASC";
    try {
      const rows = await this.db.query<RowDataPacket[]>(sql, [params.versionId]);
      return rows as ProductVersionRelease[];
    } catch (error: any) {
      throw new Error('应用查询失败');
    }
  }

  /**
   * 根据应用ID查询应用详情
   */
  async getAppById(appId: string): Promise<App | null> {
    const sql = "SELECT ID, LABEL, DESCRIPTION, APP_TYPE, repository_url, manager FROM mcp_app WHERE ID = ?";
    try {
      const rows = await this.db.query<RowDataPacket[]>(sql, [appId]);
      return rows.length > 0 ? rows[0] as App : null;
    } catch (error: any) {
      throw new Error('应用查询失败');
    }
  }

  /**
   * 查询应用列表 (所有应用)
   */
  async listApps(whereClause?: string): Promise<App[]> {
    let sql = "SELECT ID, LABEL, DESCRIPTION, APP_TYPE, repository_url, manager FROM mcp_app WHERE is_del = '1'";
    if (whereClause) {
      sql += " AND " + whereClause;
    }
    sql += " ORDER BY LABEL ASC";
    try {
      const rows = await this.db.query<RowDataPacket[]>(sql);
      return rows as App[];
    } catch (error: any) {
      throw new Error('应用查询失败');
    }
  }

  /**
   * 查询版本-应用下的子模块列表 (开发态)
   * 表: mcp_app_submodule_mapping
   */
  async listAppDevSubModules(params: QueryAppSubModulesParams): Promise<AppSubModuleMapping[]> {
    let sql = "SELECT m.id, m.product_app_id, m.sub_app_id, m.branch, m.build_sort, sub.LABEL as sub_app_code, sub.DESCRIPTION as sub_app_name FROM mcp_app_submodule_mapping m LEFT JOIN MCP_APP sub ON m.sub_app_id = sub.ID WHERE m.product_version_id = ?";
    const values: any[] = [params.versionId];
    if (params.appId) {
      sql += " AND m.product_app_id = ?";
      values.push(params.appId);
    }
    sql += " ORDER BY m.build_sort ASC";
    try {
      const rows = await this.db.query<RowDataPacket[]>(sql, values);
      return rows as AppSubModuleMapping[];
    } catch (error: any) {
      throw new Error('子模块查询失败');
    }
  }

  /**
   * 全链路查询V2: 产品 → 版本 → 应用 → 子模块 (开发态)
   */
  async queryFullChainV2(params: QueryFullChainParams): Promise<FullChainResultV2> {
    const result: FullChainResultV2 = {};

    // 1. 查询产品
    if (params.productId) {
      const product = await this.getProductById(params.productId);
      result.products = product ? [product] : [];
    } else {
      result.products = await this.listProducts();
    }

    // 2. 查询版本
    if (params.versionId) {
      const version = await this.getVersionById(params.versionId);
      result.versions = version ? [version] : [];
    } else if (params.productId) {
      result.versions = await this.listProductVersions({ productId: params.productId });
    }

    // 3. 查询版本下的应用关联
    if (params.versionId) {
      result.apps = await this.listVersionApps({ versionId: params.versionId });
    } else if (result.versions && result.versions.length > 0) {
      const apps: ProductVersionRelease[] = [];
      for (const version of result.versions) {
        const verId = (version as any).VERSION_ID;
        if (verId) {
          const versionApps = await this.listVersionApps({ versionId: verId });
          apps.push(...versionApps);
        }
      }
      result.apps = apps;
    }

    // 4. 查询子模块
    if (params.versionId) {
      result.subModules = await this.listAppDevSubModules({ versionId: params.versionId, appId: params.appId });
    } else if (result.versions && result.versions.length > 0) {
      const subModules: AppSubModuleMapping[] = [];
      for (const version of result.versions) {
        const verId = (version as any).VERSION_ID;
        if (verId) {
          const modules = await this.listAppDevSubModules({ versionId: verId });
          subModules.push(...modules);
        }
      }
      result.subModules = subModules;
    }

    return result;
  }

  /**
   * 获取应用类型描述
   */
  getAppTypeDesc(appType: string): string {
    const typeMap: Record<string, string> = {
      'WINNING_MS': 'Java微服务',
      'WINNING_WEB': '前端应用',
      'WINNING_DOCKER': 'Docker应用',
      'WINNING_DOCKER_COMPOSE': 'Docker Compose',
      'WINNING_VISUALSTUDIO_MSBUILD': 'Visual Studio',
      'WINNING_ARTIFACT': '制品',
      'WINNING_ELSE': '其他',
      'WINGPT_DOCKER': 'GPT Docker',
      'WINGPT_IMAGE': 'GPT镜像',
      'nodejs-service': 'NodeJS服务'
    };
    return typeMap[appType] || appType;
  }

  /**
   * 生成下载脚本
   * 支持三种场景:
   * 1. 明确指定迭代ID: 使用迭代态数据 (mcp_iteration_app_submodule_mapping)
   * 2. 只指定版本ID: 自动检测是否有已发布迭代
   *    - 有已发布迭代 → 使用迭代态数据
   *    - 无已发布迭代 → 使用开发态数据 (mcp_app_submodule_mapping)
   * 3. 开发版本: 使用开发态数据
   */
  async generateDownloadScript(appId: string, params: { iterationId?: string; versionId?: string }): Promise<string> {
    // 1. 查询应用信息
    const app = await this.getAppById(appId);
    if (!app) {
      throw new Error('应用不存在');
    }

    // 2. 根据模式查询子模块
    let subModules: any[] = [];
    let mode = '';
    let branchInfo = '';
    let iterationInfo: any = null;

    if (params.iterationId) {
      // 明确指定迭代ID：使用迭代模式
      const iteration = await this.getIterationById(params.iterationId);
      if (!iteration) {
        throw new Error('迭代不存在');
      }
      mode = `迭代: ${iteration.name}`;
      branchInfo = iteration.iteration_branch || '';
      iterationInfo = iteration;

      try {
        subModules = await this.listAppSubModules({ iterationId: params.iterationId, appId });
      } catch (e) {
        subModules = [];
      }
    } else if (params.versionId) {
      // 只指定版本ID：自动检测是否有已发布迭代
      const version = await this.getVersionById(params.versionId);
      if (!version) {
        throw new Error('版本不存在');
      }

      // 查询该版本下的已发布迭代 (launch_flag=2, iteration_status=2)
      try {
        const iterations = await this.listIterations({ productVersionId: params.versionId });
        // 找最新的已发布迭代 (iteration_status=2)
        const releasedIterations = iterations.filter(it => it.iteration_status === 2);

        if (releasedIterations.length > 0) {
          // 有已发布迭代：使用迭代态数据
          const latestIteration = releasedIterations[0]; // 已按时间倒序排列，第一个是最新的
          mode = `版本: ${version.name} | 迭代: ${latestIteration.name} (已发布)`;
          branchInfo = latestIteration.iteration_branch || '';
          iterationInfo = latestIteration;

          try {
            subModules = await this.listAppSubModules({ iterationId: latestIteration.id, appId });
          } catch (e) {
            subModules = [];
          }
        } else {
          // 无已发布迭代：使用开发态数据
          mode = `版本: ${version.name} (开发态)`;
          branchInfo = version.pv_branch || '';

          try {
            subModules = await this.listAppDevSubModules({ versionId: params.versionId, appId });
          } catch (e) {
            subModules = [];
          }
        }
      } catch (e) {
        // 查询迭代失败：使用开发态数据
        mode = `版本: ${version.name} (开发态)`;
        branchInfo = version.pv_branch || '';

        try {
          subModules = await this.listAppDevSubModules({ versionId: params.versionId, appId });
        } catch (e2) {
          subModules = [];
        }
      }
    } else {
      throw new Error('必须提供 iterationId 或 versionId');
    }

    // 3. 生成脚本
    const scriptLines: string[] = [];
    scriptLines.push('#!/bin/bash');
    scriptLines.push('# ============================================================');
    scriptLines.push(`# 下载脚本: ${app.label || appId}`);
    scriptLines.push(`# ${mode}`);
    scriptLines.push(`# 生成时间: ${new Date().toISOString().split('T')[0]}`);
    if (iterationInfo) {
      scriptLines.push('# 数据来源: 迭代态 (mcp_iteration_app_submodule_mapping)');
      scriptLines.push(`# 迭代分支: ${iterationInfo.iteration_branch || '无'}`);
    } else {
      scriptLines.push('# 数据来源: 开发态 (mcp_app_submodule_mapping)');
    }
    scriptLines.push('# ============================================================');
    scriptLines.push('');
    scriptLines.push(`mkdir -p ${app.label || 'app'} && cd ${app.label || 'app'}`);
    scriptLines.push('');
    scriptLines.push('echo "=== 开始下载 ==="');
    scriptLines.push('');

    if (subModules.length > 0) {
      // 有子模块：查询子模块仓库地址
      const subAppIds = subModules.map(m => m.sub_app_id);
      let repoMap: Record<string, { code: string; name: string; repo: string }> = {};
      try {
        const subAppRepoSql = `SELECT ID, LABEL, DESCRIPTION, REPOSITORY_URL FROM MCP_APP WHERE ID IN (${subAppIds.map(id => `"${id}"`).join(',')})`;
        const subAppRows = await this.db.query<RowDataPacket[]>(subAppRepoSql);
        for (const row of subAppRows) {
          repoMap[row.ID] = {
            code: row.LABEL || '',
            name: row.DESCRIPTION || '',
            repo: row.REPOSITORY_URL || ''
          };
        }
      } catch (e) {
        // 查询失败，使用空映射
      }

      // 按 build_sort 排序
      const sortedSubModules = [...subModules].sort((a, b) => (a.build_sort || 0) - (b.build_sort || 0));

      for (const sub of sortedSubModules) {
        const info = repoMap[sub.sub_app_id];
        if (!info || !info.repo) {
          scriptLines.push(`# 警告: ${sub.sub_app_id} 无仓库地址，跳过`);
          continue;
        }
        const branch = sub.branch || branchInfo || 'master';
        scriptLines.push(`git clone -b ${branch} ${info.repo}`);
        scriptLines.push('');
      }
    } else if (app.repository_url) {
      // 无子模块：直接使用应用仓库地址
      const branch = branchInfo || 'master';
      scriptLines.push(`git clone -b ${branch} ${app.repository_url}`);
      scriptLines.push('');
    } else {
      scriptLines.push('# 无可用仓库地址');
      scriptLines.push('');
    }

    scriptLines.push('echo "=== 完成 ==="');
    scriptLines.push('ls -la');

    const scriptContent = scriptLines.join('\n');

    // 4. 写入临时文件
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `download_${Date.now()}.sh`);
    writeFileSync(tempFile, scriptContent, { mode: 0o755 });

    // 5. 返回脚本内容（用 markdown 代码块包裹，确保前端正确渲染）
    return `以下是下载脚本内容，可直接复制执行：

\`\`\`bash
${scriptContent}
\`\`\`

脚本已保存至临时文件: ${tempFile}`;
  }

  /**
   * 生成迭代下载脚本（包含所有应用）
   * 当用户提供版本ID时，自动检测最新已发布迭代，生成所有应用的下载脚本
   *
   * @param params.iterationId 迭代ID（可选）
   * @param params.versionId 版本ID（可选，自动查找最新已发布迭代）
   * @param params.appType 应用类型筛选（可选，默认 'WINNING_MS' 即Java应用）
   */
  async generateIterationDownloadScript(params: {
    iterationId?: string;
    versionId?: string;
    appType?: string;
  }): Promise<string> {
    let targetIteration: any = null;
    let versionInfo: any = null;
    let modeDesc = '';

    // 1. 确定目标迭代
    if (params.iterationId) {
      targetIteration = await this.getIterationById(params.iterationId);
      if (!targetIteration) {
        throw new Error('迭代不存在');
      }
      // 查询版本信息
      versionInfo = await this.getVersionById(targetIteration.id_pvreleaseid);
      modeDesc = `迭代: ${targetIteration.name}`;
    } else if (params.versionId) {
      versionInfo = await this.getVersionById(params.versionId);
      if (!versionInfo) {
        throw new Error('版本不存在');
      }

      // 查询已发布迭代
      const iterations = await this.listIterations({ productVersionId: params.versionId });
      const releasedIterations = iterations.filter(it => it.iteration_status === 2);

      if (releasedIterations.length > 0) {
        targetIteration = releasedIterations[0];
        modeDesc = `版本: ${versionInfo.name} | 迭代: ${targetIteration.name}`;
      } else {
        throw new Error('该版本下无已发布迭代，无法生成迭代态下载脚本');
      }
    } else {
      throw new Error('必须提供 iterationId 或 versionId');
    }

    // 2. 查询迭代下的应用列表
    const appType = params.appType || 'WINNING_MS'; // 默认Java应用
    const apps = await this.listIterationApps({ iterationId: targetIteration.id });
    const filteredApps = apps.filter(app => {
      // 根据应用类型筛选
      if (appType === 'WINNING_MS') {
        return (app as any).APP_TYPE === 'WINNING_MS';
      }
      return true; // 不筛选
    });

    if (filteredApps.length === 0) {
      throw new Error(`该迭代下无 ${appType} 类型应用`);
    }

    // 3. 生成脚本
    const scriptLines: string[] = [];
    scriptLines.push('#!/bin/bash');
    scriptLines.push('# ============================================================');
    scriptLines.push('# WiNEX下载脚本 - 迭代态');
    scriptLines.push('# ============================================================');
    scriptLines.push(`# ${modeDesc}`);
    scriptLines.push(`# 迭代ID: ${targetIteration.id}`);
    scriptLines.push(`# 迭代分支: ${targetIteration.iteration_branch || '无'}`);
    scriptLines.push(`# 应用数量: ${filteredApps.length} 个`);
    scriptLines.push(`# 应用类型: ${appType}`);
    scriptLines.push(`# 生成时间: ${new Date().toISOString().split('T')[0]}`);
    scriptLines.push('# 数据来源: 迭代态 (mcp_iteration_app_submodule_mapping)');
    scriptLines.push('# ============================================================');
    scriptLines.push('');

    const baseDir = `${versionInfo?.name || 'download'}-${targetIteration.name}`;
    scriptLines.push(`BASE_DIR="${baseDir}"`);
    scriptLines.push('mkdir -p "$BASE_DIR" && cd "$BASE_DIR"');
    scriptLines.push('');
    scriptLines.push('echo "==========================================";');
    scriptLines.push(`echo "下载脚本: ${targetIteration.name}"`);
    scriptLines.push(`echo "应用数量: ${filteredApps.length}"`);
    scriptLines.push('echo "==========================================";');
    scriptLines.push('');

    // 4. 为每个应用生成下载命令
    const appStats: { label: string; dir: string; count: number }[] = [];

    for (let i = 0; i < filteredApps.length; i++) {
      const app = filteredApps[i];
      const appLabel = (app as any).app_label || '';
      const appId = (app as any).id_app;
      const appDesc = (app as any).DESCRIPTION || appLabel;

      // 目录名：使用完整应用标签名（不做简化）
      const appDir = appLabel;

      scriptLines.push('# ====================');
      scriptLines.push(`# [${i + 1}/${filteredApps.length}] ${appDesc} (${appLabel})`);
      scriptLines.push('# ====================');
      scriptLines.push(`echo ""`);
      scriptLines.push(`echo "[${i + 1}/${filteredApps.length}] 下载 ${appDesc}..."`);
      scriptLines.push(`mkdir -p ${appDir} && cd ${appDir}`);
      scriptLines.push('');

      // 查询该应用的子模块
      try {
        const subModules = await this.listAppSubModules({ iterationId: targetIteration.id, appId });

        if (subModules.length > 0) {
          // 按 build_sort 排序
          const sortedSubModules = [...subModules].sort((a, b) => ((a as any).build_sort || 0) - ((b as any).build_sort || 0));

          for (const sub of sortedSubModules) {
            const subAppId = (sub as any).sub_app_id;
            const branch = (sub as any).branch || targetIteration.iteration_branch || 'master';

            // 查询子模块仓库地址
            const subAppInfo = await this.getAppById(subAppId);
            if (subAppInfo && subAppInfo.repository_url) {
              scriptLines.push(`git clone -b ${branch} ${subAppInfo.repository_url}`);
            } else {
              scriptLines.push(`# 警告: ${subAppId} 无仓库地址，跳过`);
            }
          }
          appStats.push({ label: appLabel, dir: appDir, count: subModules.length });
        } else {
          // 无子模块，查询应用本身的仓库
          const appInfo = await this.getAppById(appId);
          if (appInfo && appInfo.repository_url) {
            const branch = targetIteration.iteration_branch || 'master';
            scriptLines.push(`git clone -b ${branch} ${appInfo.repository_url}`);
            appStats.push({ label: appLabel, dir: appDir, count: 1 });
          } else {
            scriptLines.push('# 无子模块且无仓库地址');
            appStats.push({ label: appLabel, dir: appDir, count: 0 });
          }
        }
      } catch (e) {
        scriptLines.push('# 查询子模块失败');
        appStats.push({ label: appLabel, dir: appDir, count: 0 });
      }

      scriptLines.push('');
      scriptLines.push('cd ..');
      scriptLines.push('');
    }

    // 5. 添加完成信息
    scriptLines.push('echo ""');
    scriptLines.push('echo "==========================================";');
    scriptLines.push('echo "下载完成!"');
    scriptLines.push('echo "==========================================";');
    scriptLines.push('echo ""');
    scriptLines.push('echo "目录结构:"');
    scriptLines.push('ls -la');
    scriptLines.push('echo ""');
    scriptLines.push('echo "各应用子模块数量:"');
    for (const stat of appStats) {
      scriptLines.push(`echo "  - ${stat.dir}: $(ls -1 ${stat.dir} | wc -l) 个"`);
    }

    const scriptContent = scriptLines.join('\n');

    // 6. 写入临时文件
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `download_iteration_${Date.now()}.sh`);
    writeFileSync(tempFile, scriptContent, { mode: 0o755 });

    return `下载脚本已生成：

\`\`\`bash
${scriptContent}
\`\`\`

脚本已保存至: ${tempFile}`;
  }
}
