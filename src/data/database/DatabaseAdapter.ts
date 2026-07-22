/**
 * 数据库抽象层接口
 *
 * 设计目的:
 * - Web 端: sql.js (WASM)
 * - 移动端: capacitor-sqlite (原生)
 * - 均通过统一接口访问
 */
export interface DatabaseAdapter {
  /** 初始化数据库 (建表、种子数据) */
  initialize(): Promise<void>;

  /** 执行 SQL 查询 (读) */
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;

  /** 执行 SQL 语句 (写) */
  execute(sql: string, params?: unknown[]): Promise<void>;

  /** 执行写操作并返回 lastInsertRowId */
  executeReturning(sql: string, params?: unknown[]): Promise<number>;

  /** 批量执行 (事务) */
  transaction<T>(fn: () => Promise<T>): Promise<T>;

  /** 关闭数据库 */
  close(): Promise<void>;
}
