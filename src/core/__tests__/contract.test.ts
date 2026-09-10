/**
 * 契约测试（N-4）：所有"写方法"必须注册在 services 的 REGISTRY.writes 白名单里
 *
 * 纯静态扫描（不加载应用代码），将来新增写方法忘记注册 → 测试红，避免"静默不 emit"。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoDir = path.resolve(here, '../../data/repositories');
const servicesPath = path.resolve(here, '../../data/services.ts');

const FILE_TO_SERVICE: Record<string, string> = {
  TransactionRepository: 'transactionRepo',
  CategoryRepository: 'categoryRepo',
  AccountRepository: 'accountRepo',
  BudgetRepository: 'budgetRepo',
  RecurringRepository: 'recurringRepo',
  SettingsRepository: 'settingsRepo',
  StatsRepository: 'statsRepo',
};

/** 写方法前缀约定（读方法：get/list/count/find/has） */
const WRITE_PREFIX = /^(create|update|delete|restore|set|remove|toggle|clear)/;

function readRegistry(): Record<string, string[]> {
  const src = readFileSync(servicesPath, 'utf8');
  const registry: Record<string, string[]> = {};
  const re = /(\w+Repo):\s*\{[^}]*?writes:\s*\[([^\]]*)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const key = m[1]!;
    const writes = m[2]!.split(',').map((s) => s.trim().replace(/['"]/g, '')).filter(Boolean);
    registry[key] = writes;
  }
  return registry;
}

/** 提取类内方法名（缩进 2 空格，忽略 constructor） */
function classMethods(file: string): string[] {
  const src = readFileSync(path.join(repoDir, file), 'utf8');
  const methods: string[] = [];
  const re = /^ {2}(?:async\s+)?([A-Za-z_]\w*)\s*\(/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    methods.push(m[1]!);
  }
  return methods;
}

test('每个仓库都有对应的 services 注册项', () => {
  const registry = readRegistry();
  for (const serviceKey of Object.values(FILE_TO_SERVICE)) {
    assert.ok(registry[serviceKey], `services REGISTRY 缺少 ${serviceKey}`);
  }
});

test('所有写方法都已注册到 REGISTRY.writes（防止静默不 emit）', () => {
  const registry = readRegistry();
  const missing: string[] = [];

  for (const [file, serviceKey] of Object.entries(FILE_TO_SERVICE)) {
    const registered = new Set(registry[serviceKey] ?? []);
    const methods = classMethods(file + '.ts');
    for (const name of methods) {
      if (!WRITE_PREFIX.test(name)) continue;
      if (!registered.has(name)) missing.push(`${file}.${name}`);
    }
  }

  assert.deepEqual(missing, [], `以下写方法未注册到 services.Registry.writes：\n${missing.join('\n')}`);
});

test('REGISTRY 未登记不存在的写方法（防止拼写错误）', () => {
  const registry = readRegistry();
  const problems: string[] = [];
  for (const [file, serviceKey] of Object.entries(FILE_TO_SERVICE)) {
    const methods = new Set(classMethods(file + '.ts'));
    for (const w of registry[serviceKey] ?? []) {
      if (!methods.has(w) && w !== 'restore') problems.push(`${serviceKey}.${w} 在 ${file} 中不存在`);
    }
  }
  assert.deepEqual(problems, [], `注册了不存在的方法：\n${problems.join('\n')}`);
});

test('repositories 目录与映射表保持一致（新增仓库需登记）', () => {
  const files = readdirSync(repoDir).filter((f) => f.endsWith('Repository.ts'));
  const known = new Set(Object.keys(FILE_TO_SERVICE).map((k) => k + '.ts'));
  const unknown = files.filter((f) => !known.has(f));
  assert.deepEqual(unknown, [], `以下仓库未纳入契约测试映射：${unknown.join(', ')}`);
});
