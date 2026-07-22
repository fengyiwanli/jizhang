/**
 * 种子数据初始化
 *
 * 包含:
 * - 默认账本
 * - 预设分类体系 (文档 5.2.2 节)
 * - 默认账户 (现金)
 */
import type { DatabaseAdapter } from './database/DatabaseAdapter';
import { DEFAULT_LEDGER, DEFAULT_LEDGER_ID } from '@/domain/entities/Ledger';
import { nowUTC } from '@/core/datetime';

/** 预设支出分类 */
const EXPENSE_CATEGORIES = [
  { id: 'cat-exp-01', parentId: null, name: '餐饮', icon: '🍜', color: '#FF6B6B', sortOrder: 1 },
  { id: 'cat-exp-02', parentId: 'cat-exp-01', name: '早餐', icon: '🌅', color: '#FF6B6B', sortOrder: 1 },
  { id: 'cat-exp-03', parentId: 'cat-exp-01', name: '午餐', icon: '☀️', color: '#FF6B6B', sortOrder: 2 },
  { id: 'cat-exp-04', parentId: 'cat-exp-01', name: '晚餐', icon: '🌙', color: '#FF6B6B', sortOrder: 3 },
  { id: 'cat-exp-05', parentId: 'cat-exp-01', name: '零食/饮料', icon: '🍿', color: '#FF6B6B', sortOrder: 4 },
  { id: 'cat-exp-06', parentId: 'cat-exp-01', name: '外卖', icon: '🛵', color: '#FF6B6B', sortOrder: 5 },
  { id: 'cat-exp-07', parentId: null, name: '交通', icon: '🚗', color: '#4ECDC4', sortOrder: 2 },
  { id: 'cat-exp-08', parentId: 'cat-exp-07', name: '公交/地铁', icon: '🚇', color: '#4ECDC4', sortOrder: 1 },
  { id: 'cat-exp-09', parentId: 'cat-exp-07', name: '打车', icon: '🚕', color: '#4ECDC4', sortOrder: 2 },
  { id: 'cat-exp-10', parentId: 'cat-exp-07', name: '加油/停车', icon: '⛽', color: '#4ECDC4', sortOrder: 3 },
  { id: 'cat-exp-11', parentId: null, name: '购物', icon: '🛒', color: '#45B7D1', sortOrder: 3 },
  { id: 'cat-exp-12', parentId: 'cat-exp-11', name: '日用品', icon: '🧴', color: '#45B7D1', sortOrder: 1 },
  { id: 'cat-exp-13', parentId: 'cat-exp-11', name: '服饰', icon: '👗', color: '#45B7D1', sortOrder: 2 },
  { id: 'cat-exp-14', parentId: 'cat-exp-11', name: '数码', icon: '📱', color: '#45B7D1', sortOrder: 3 },
  { id: 'cat-exp-15', parentId: null, name: '居家', icon: '🏠', color: '#96CEB4', sortOrder: 4 },
  { id: 'cat-exp-16', parentId: 'cat-exp-15', name: '房租/房贷', icon: '🏢', color: '#96CEB4', sortOrder: 1 },
  { id: 'cat-exp-17', parentId: 'cat-exp-15', name: '水电燃气', icon: '💡', color: '#96CEB4', sortOrder: 2 },
  { id: 'cat-exp-18', parentId: 'cat-exp-15', name: '家具', icon: '🛋️', color: '#96CEB4', sortOrder: 3 },
  { id: 'cat-exp-19', parentId: null, name: '娱乐', icon: '🎬', color: '#FFEAA7', sortOrder: 5 },
  { id: 'cat-exp-20', parentId: null, name: '医疗', icon: '💊', color: '#DDA0DD', sortOrder: 6 },
  { id: 'cat-exp-21', parentId: null, name: '教育', icon: '📚', color: '#98D8C8', sortOrder: 7 },
  { id: 'cat-exp-22', parentId: null, name: '其他支出', icon: '📦', color: '#B0B0B0', sortOrder: 99 },
];

/** 预设收入分类 */
const INCOME_CATEGORIES = [
  { id: 'cat-inc-01', parentId: null, name: '工资', icon: '💰', color: '#2ECC71', sortOrder: 1 },
  { id: 'cat-inc-02', parentId: null, name: '奖金', icon: '🎁', color: '#F39C12', sortOrder: 2 },
  { id: 'cat-inc-03', parentId: null, name: '投资', icon: '📈', color: '#3498DB', sortOrder: 3 },
  { id: 'cat-inc-04', parentId: null, name: '兼职', icon: '💼', color: '#9B59B6', sortOrder: 4 },
  { id: 'cat-inc-05', parentId: null, name: '其他收入', icon: '➕', color: '#B0B0B0', sortOrder: 99 },
];

/** 默认账户 */
const DEFAULT_ACCOUNTS = [
  { id: 'acc-default-01', name: '现金', type: 'cash' as const, icon: '💵', sortOrder: 1 },
  { id: 'acc-default-02', name: '银行卡', type: 'bank' as const, icon: '🏦', sortOrder: 2 },
  { id: 'acc-default-03', name: '支付宝', type: 'e-wallet' as const, icon: '🔵', sortOrder: 3 },
  { id: 'acc-default-04', name: '微信', type: 'e-wallet' as const, icon: '🟢', sortOrder: 4 },
];

/** 检查种子数据是否已安装 */
export async function isSeedInstalled(db: DatabaseAdapter): Promise<boolean> {
  const rows = await db.query<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM ledgers WHERE id = ?',
    [DEFAULT_LEDGER_ID],
  );
  return rows[0]?.cnt > 0;
}

/** 安装种子数据 */
export async function installSeed(db: DatabaseAdapter): Promise<void> {
  const now = nowUTC();

  // 1. 默认账本
  await db.execute(
    `INSERT OR IGNORE INTO ledgers (id, name, description, type, currency, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      DEFAULT_LEDGER.id,
      DEFAULT_LEDGER.name,
      DEFAULT_LEDGER.description,
      DEFAULT_LEDGER.type,
      DEFAULT_LEDGER.currency,
      now,
      now,
    ],
  );

  // 2. 默认账户
  for (const acc of DEFAULT_ACCOUNTS) {
    await db.execute(
      `INSERT OR IGNORE INTO accounts (id, ledger_id, name, type, icon, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [acc.id, DEFAULT_LEDGER_ID, acc.name, acc.type, acc.icon, acc.sortOrder, now, now],
    );
  }

  // 3. 支出分类
  for (const cat of EXPENSE_CATEGORIES) {
    await db.execute(
      `INSERT OR IGNORE INTO categories (id, ledger_id, parent_id, name, type, icon, color, sort_order, is_system, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'expense', ?, ?, ?, 1, ?, ?)`,
      [cat.id, DEFAULT_LEDGER_ID, cat.parentId, cat.name, cat.icon, cat.color, cat.sortOrder, now, now],
    );
  }

  // 4. 收入分类
  for (const cat of INCOME_CATEGORIES) {
    await db.execute(
      `INSERT OR IGNORE INTO categories (id, ledger_id, parent_id, name, type, icon, color, sort_order, is_system, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'income', ?, ?, ?, 1, ?, ?)`,
      [cat.id, DEFAULT_LEDGER_ID, cat.parentId, cat.name, cat.icon, cat.color, cat.sortOrder, now, now],
    );
  }
}
