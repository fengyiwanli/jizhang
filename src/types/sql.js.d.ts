/**
 * sql.js 全局类型声明
 *
 * sql.js 通过 <script> 标签加载，暴露全局 window.initSqlJs
 */
interface SqlJsStatic {
  Database: new (data?: ArrayLike<number> | null) => SqlJsDatabase;
}

interface SqlJsDatabase {
  run(sql: string, params?: unknown[]): void;
  exec(sql: string): SqlJsQueryExecResult[];
  prepare(sql: string): SqlJsStatement;
  export(): Uint8Array;
  close(): void;
  create_function(name: string, func: (...args: unknown[]) => unknown): void;
}

interface SqlJsStatement {
  bind(params?: unknown[]): boolean;
  step(): boolean;
  getAsObject(): Record<string, unknown>;
  free(): boolean;
}

interface SqlJsQueryExecResult {
  columns: string[];
  values: unknown[][];
}

interface SqlJsConfig {
  locateFile?: (file: string) => string;
}

declare function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>;
