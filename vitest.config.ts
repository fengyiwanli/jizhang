/**
 * Vitest 配置（N-4：数据库层测试）
 *
 * 仅用于 CI（本地 npm 装不上包）；本地核心逻辑测试走 node --experimental-strip-types。
 */
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(root, 'src') },
  },
  test: {
    environment: 'node',
    include: ['src/data/**/__tests__/**/*.test.ts'],
  },
});
