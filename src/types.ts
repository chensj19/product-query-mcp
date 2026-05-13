/**
 * 产品实体
 * 表名: mcp_product
 */
export interface Product {
  product_id: string;
  name: string;
  code: string;
  config_code?: string;
  branch?: string;
  dec?: string;
  no?: number;
  is_hide?: boolean;
  tfs_project?: string;
  tfs_project_id?: string;
  product_manager?: string;
  product_manager_phone?: string;
}

/**
 * 产品版本实体
 * 表名: mcp_pversion
 */
export interface ProductVersion {
  version_id: string;
  product_id: string;
  version?: string;
  name: string;
  pv_branch?: string;
  pv_branch_show?: string;
  dec?: string;
  isform?: boolean;
  deploy_mode?: string;
  is_main?: boolean;
  is_common_version?: boolean;
  create_by?: string;
  create_time?: Date;
}

/**
 * 迭代实体
 * 表名: mcp_base_version
 */
export interface BaseVersion {
  id: string;
  id_pvreleaseid: string;  // 关联版本ID
  name: string;
  code?: string;
  description?: string;
  iteration_status: number; // 0:初始化, 1:预发布, 2:发布
  iteration_branch?: string;
  iteration_tag?: string;
  use_iteration_branch?: number;
  build_image?: number;
  launch_flag?: number;  // 2:新迭代
  start_time?: Date;
  end_time?: Date;
  created_by?: string;
  createtime?: string;
}

/**
 * 迭代应用实体
 * 表名: mcp_iteration_app
 */
export interface ProductVersionIterationApp {
  id: string;
  iteration_id: string;
  product_version_id?: string;
  id_app: string;  // 应用ID
  app_label?: string;
  app_show?: string;
  app_mode?: string;  // aaio, whole, integration, wdsfhir, tmts, database, test, neo4j, other
  app_type?: string;
  app_release_id?: string;
  app_version?: string;
  iteration_branch?: string;
  enabled?: boolean;
  is_self_sync?: boolean;
  description?: string;
  manager?: string;
}

/**
 * 迭代应用子模块映射实体
 * 表名: mcp_iteration_app_submodule_mapping
 */
export interface IterationAppSubModuleMapping {
  id: string;
  product_id?: string;
  product_version_id?: string;
  iteration_id: string;
  product_app_id: string;  // 应用ID
  sub_app_id: string;      // 子模块ID
  sub_app_code?: string;
  sub_app_name?: string;
  parent_app_code?: string;
  parent_app_name?: string;
  branch?: string;
  source_branch?: string;
  iteration_tag?: string;
  app_release_id?: string;
  build_sort?: number;     // 构建顺序
  last_version?: string;
  iteration_status?: string;
  iteration_name?: string;
}

/**
 * 查询参数类型
 */
export interface QueryProductsParams {
  userCode?: string;
  whereClause?: string;
}

export interface QueryVersionsParams {
  productId: string;
}

export interface QueryIterationsParams {
  productVersionId: string;
}

export interface QueryAppsParams {
  iterationId: string;
}

export interface QuerySubModulesParams {
  iterationId: string;
  appId?: string;
}

export interface QueryFullChainParams {
  productId?: string;
  versionId?: string;
  iterationId?: string;
  appId?: string;
}

/**
 * 全链路查询结果 (第一条链路: 产品-版本-迭代-应用-子模块)
 */
export interface FullChainResult {
  products?: Product[];
  versions?: ProductVersion[];
  iterations?: BaseVersion[];
  apps?: ProductVersionIterationApp[];
  subModules?: IterationAppSubModuleMapping[];
}

// ========== 第二条链路: 产品-版本-应用-子模块 ==========

/**
 * 产品版本应用关联实体 (开发态)
 * 表名: mcp_version_release
 */
export interface ProductVersionRelease {
  version_release_id: string;
  version_id: string;        // 产品版本ID
  id_app: string;            // 应用ID
  type?: string;             // 应用编码/标签
  typeshow?: string;
  release_id?: string;       // 应用制品版本ID
  enabled?: boolean;
  app_mode?: string;         // 应用模式
  sorted?: number;
  is_self_sync?: boolean;
  patch_branch?: string;
}

/**
 * 应用实体
 * 表名: mcp_app
 */
export interface App {
  id: string;
  label?: string;            // 应用标签/编码
  description?: string;      // 应用名称/描述
  app_type?: string;         // 应用类型: WINNING_MS, WINNING_WEB, WINNING_DOCKER 等
  program_name?: string;
  repository_url?: string;
  repository_id?: string;
  app_mode?: string;         // 应用模式
  manager?: string;          // 负责人
  is_del?: string;           // 状态: 0初始化, 1启用, 2停止, 3删除
  use_flag?: string;         // 使用标志: 0停用, 1使用中
  parentAppId?: string;      // 父应用ID
}

/**
 * 应用子模块映射实体 (开发态)
 * 表名: mcp_app_submodule_mapping
 */
export interface AppSubModuleMapping {
  id: string;
  product_id?: string;
  product_version_id?: string;
  product_app_id: string;    // 应用ID (AppDO.ID)
  sub_app_id: string;        // 子模块ID
  branch?: string;
  build_sort?: number;       // 构建顺序
  last_version?: string;
  last_version_for_newbuild?: string;
  sub_app_code?: string;
  sub_app_name?: string;
  parent_app_code?: string;
  parent_app_name?: string;
}

/**
 * 查询版本下应用参数 (第二条链路)
 */
export interface QueryVersionAppsParams {
  versionId: string;
}

/**
 * 查询应用下子模块参数 (第二条链路)
 */
export interface QueryAppSubModulesParams {
  versionId: string;
  appId?: string;
}

/**
 * 全链路查询结果 (第二条链路)
 */
export interface FullChainResultV2 {
  products?: Product[];
  versions?: ProductVersion[];
  apps?: ProductVersionRelease[];  // 版本应用关联
  appDetails?: App[];              // 应用详情
  subModules?: AppSubModuleMapping[];
}