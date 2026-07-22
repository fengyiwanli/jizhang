/**
 * Category Repository
 */
import type { DatabaseAdapter } from '../database/DatabaseAdapter';
import type { Category, CreateCategoryInput, CategoryType } from '@/domain/entities/Category';
import type { UUID } from '@/core/types';
import { generateUUID } from '@/core/uuid';
import { nowUTC } from '@/core/datetime';
import { DEFAULT_LEDGER_ID } from '@/domain/entities/Ledger';

export class CategoryRepository {
  constructor(private db: DatabaseAdapter) {}

  async getById(id: UUID): Promise<Category | null> {
    const rows = await this.db.query<Category>(
      'SELECT * FROM categories WHERE id = ? AND deleted_at IS NULL',
      [id],
    );
    return rows[0] ?? null;
  }

  /** 获取所有分类 (含父子关系) */
  async listAll(ledgerId: UUID = DEFAULT_LEDGER_ID): Promise<Category[]> {
    return this.db.query<Category>(
      'SELECT * FROM categories WHERE ledger_id = ? AND deleted_at IS NULL ORDER BY type, sort_order, name',
      [ledgerId],
    );
  }

  /** 按类型获取分类 */
  async listByType(type: CategoryType, ledgerId: UUID = DEFAULT_LEDGER_ID): Promise<Category[]> {
    return this.db.query<Category>(
      'SELECT * FROM categories WHERE ledger_id = ? AND type = ? AND deleted_at IS NULL ORDER BY sort_order, name',
      [ledgerId, type],
    );
  }

  /** 获取一级分类 (parent_id IS NULL) */
  async listRoot(type?: CategoryType, ledgerId: UUID = DEFAULT_LEDGER_ID): Promise<Category[]> {
    let sql = 'SELECT * FROM categories WHERE ledger_id = ? AND parent_id IS NULL AND deleted_at IS NULL';
    const params: unknown[] = [ledgerId];
    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }
    sql += ' ORDER BY sort_order, name';
    return this.db.query<Category>(sql, params);
  }

  /** 获取子分类 */
  async listChildren(parentId: UUID): Promise<Category[]> {
    return this.db.query<Category>(
      'SELECT * FROM categories WHERE parent_id = ? AND deleted_at IS NULL ORDER BY sort_order, name',
      [parentId],
    );
  }

  /** 创建自定义分类 */
  async create(input: CreateCategoryInput): Promise<Category> {
    const id = generateUUID();
    const now = nowUTC();

    await this.db.execute(
      `INSERT INTO categories (id, ledger_id, parent_id, name, type, icon, color, sort_order, is_system, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.ledgerId || DEFAULT_LEDGER_ID,
        input.parentId ?? null,
        input.name,
        input.type,
        input.icon ?? '📦',
        input.color ?? '#B0B0B0',
        input.sortOrder ?? 99,
        input.isSystem ?? 0,
        now,
        now,
      ],
    );

    const cat = await this.getById(id);
    if (!cat) throw new Error('Failed to create category');
    return cat;
  }

  /** 更新分类 */
  async update(id: UUID, input: Partial<CreateCategoryInput>): Promise<void> {
    const sets: string[] = ['updated_at = ?'];
    const params: unknown[] = [nowUTC()];

    if (input.name !== undefined) { sets.push('name = ?'); params.push(input.name); }
    if (input.icon !== undefined) { sets.push('icon = ?'); params.push(input.icon); }
    if (input.color !== undefined) { sets.push('color = ?'); params.push(input.color); }
    if (input.sortOrder !== undefined) { sets.push('sort_order = ?'); params.push(input.sortOrder); }
    if (input.parentId !== undefined) { sets.push('parent_id = ?'); params.push(input.parentId); }

    params.push(id);
    await this.db.execute(
      `UPDATE categories SET ${sets.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
      params,
    );
  }

  /** 软删除分类 */
  async delete(id: UUID): Promise<void> {
    const now = nowUTC();
    await this.db.execute(
      'UPDATE categories SET deleted_at = ?, updated_at = ? WHERE id = ?',
      [now, now, id],
    );
  }

  async clearAll(): Promise<void> {
    await this.db.execute('DELETE FROM categories');
  }
}
