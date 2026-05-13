import mysql, { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

class DatabaseService {
  private pool: Pool | null = null;
  private config: DatabaseConfig;
  private initialized: boolean = false;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  /**
   * 懒加载初始化连接池
   */
  private async ensurePool(): Promise<Pool> {
    if (!this.pool) {
      this.pool = mysql.createPool({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000
      });
      this.initialized = true;
    }
    return this.pool;
  }

  /**
   * 测试数据库连接
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const pool = await this.ensurePool();
      const conn = await pool.getConnection();
      await conn.ping();
      conn.release();
      return { success: true, message: '数据库连接成功' };
    } catch (error: any) {
      const errMsg = error.message || '未知错误';
      return {
        success: false,
        message: '数据库连接失败'
      };
    }
  }

  async query<T extends RowDataPacket[]>(sql: string, params?: any[]): Promise<T> {
    const pool = await this.ensurePool();
    try {
      const [rows] = await pool.execute<T>(sql, params);
      return rows;
    } catch (error: any) {
      throw new Error('查询失败');
    }
  }

  async getConnection(): Promise<PoolConnection> {
    const pool = await this.ensurePool();
    return pool.getConnection();
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.initialized = false;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export { DatabaseService, DatabaseConfig };