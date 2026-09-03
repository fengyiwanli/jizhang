/**
 * 分类图标映射 — Lucide SVG 矢量图标
 *
 * 种子数据中的分类通过 icon 字段存储 emoji，同时提供 SVG 备选
 * 运行时优先使用 Lucide 图标，emoji 作为后备
 */
import {
  Utensils, ShoppingBag, Car, Gamepad2, Home, Shirt, HeartPulse,
  Smartphone, Gift, Plane, BookOpen, Cat, Dumbbell, MonitorPlay,
  Briefcase, Wallet, TrendingUp, RotateCcw, Zap, Coffee, Bus,
  Music, Stethoscope, GraduationCap, Wrench, Banknote,
  Fuel, CircleParking, TrainFront, Cookie, Package,
  Cake, Beer, Pizza, ShoppingCart, Footprints, Bike,
  Sofa, Lightbulb, Sparkles, Clapperboard, Ticket, PenLine,
  Pill, PawPrint, Baby, PiggyBank, Phone, Tv, Camera, Globe,
  type LucideIcon,
} from 'lucide-react';

/** category name → Lucide SVG icon */
const NAME_TO_ICON: Record<string, LucideIcon> = {
  餐饮: Utensils, 早餐: Coffee, 午餐: Utensils, 晚餐: Utensils,
  外卖: ShoppingBag,
  // 零食/饮料：零食用 Cookie 更贴切，饮料保留 Coffee
  '零食/饮料': Cookie, 零食: Cookie, 饮料: Coffee,
  购物: ShoppingBag, 日用: ShoppingBag, 日用品: ShoppingBag, 数码: Smartphone, 服饰: Shirt,
  交通: Car, 公交: Bus, 地铁: Bus, 打车: Car,
  // 加油/停车：燃油/定位图标，不再 fallback 闪电
  '加油/停车': Fuel, 加油: Fuel, 停车: CircleParking,
  // 新增：火车高铁 / 飞机 / 长途大巴
  '火车/高铁': TrainFront, 火车: TrainFront, 高铁: TrainFront,
  '飞机/机票': Plane, 飞机: Plane, 机票: Plane,
  '长途/大巴': Bus, 长途: Bus, 大巴: Bus,
  娱乐: Gamepad2, 电影: MonitorPlay, 游戏: Gamepad2, 旅行: Plane, 音乐: Music,
  居家: Home, 房租: Home, 房贷: Home, 水电: Zap, 维修: Wrench, 家具: Home,
  医疗: HeartPulse, 药品: Stethoscope,
  通讯: Smartphone,
  礼品: Gift,
  学习: BookOpen, 教育: GraduationCap,
  宠物: Cat,
  健身: Dumbbell,
  工资: Briefcase, 兼职: Wallet, 理财: TrendingUp, 投资: TrendingUp, 退款: RotateCcw, 奖金: Banknote,
  其他: Package, 其他支出: Package, 其他收入: Package,
};

/** 按名称查找 Lucide 图标，找不到返回 null */
export function getCategoryIcon(name: string): LucideIcon | null {
  // 精确匹配
  if (NAME_TO_ICON[name]) return NAME_TO_ICON[name];
  // 模糊匹配：名称包含关键词
  for (const [key, icon] of Object.entries(NAME_TO_ICON)) {
    if (name.includes(key)) return icon;
  }
  return null;
}

/** 获取分类的默认颜色 */
export function getCategoryColor(name: string): string {
  const map: Record<string, string> = {
    餐饮: '#E07B6C', 早餐: '#E07B6C', 午餐: '#E07B6C', 晚餐: '#E07B6C',
    '零食/饮料': '#E07B6C', 零食: '#E07B6C', 饮料: '#E07B6C', 外卖: '#E07B6C',
    购物: '#F0A060', 日用: '#F0A060', 日用品: '#F0A060', 数码: '#5B8DEF', 服饰: '#D070A0',
    交通: '#6CB4EE', 公交: '#6CB4EE', 地铁: '#6CB4EE', 打车: '#6CB4EE',
    '加油/停车': '#6CB4EE', 加油: '#6CB4EE', 停车: '#6CB4EE',
    '火车/高铁': '#6CB4EE', 火车: '#6CB4EE', 高铁: '#6CB4EE',
    '飞机/机票': '#6CB4EE', 飞机: '#6CB4EE', 机票: '#6CB4EE',
    '长途/大巴': '#6CB4EE', 长途: '#6CB4EE', 大巴: '#6CB4EE',
    娱乐: '#A78BFA', 电影: '#A78BFA', 游戏: '#A78BFA', 旅行: '#60C0D0', 音乐: '#A78BFA',
    居家: '#94A3B8', 房租: '#94A3B8', 房贷: '#94A3B8', 水电: '#F5B041', 维修: '#94A3B8', 家具: '#94A3B8',
    医疗: '#F08080', 药品: '#F08080',
    通讯: '#5B8DEF',
    礼品: '#F08080',
    学习: '#7DBE7D', 教育: '#7DBE7D',
    工资: '#5FBB97', 兼职: '#5FBB97', 理财: '#5FBB97', 投资: '#5FBB97', 奖金: '#5FBB97',
    其他: '#94A3B8', 其他支出: '#94A3B8', 其他收入: '#94A3B8',
  };
  return map[name] ?? '#94A3B8';
}

/** 把颜色转为 10% 透明度的底色（图标容器用）。
 * 支持 hex（#RRGGBB）与 CSS 变量；CSS 变量无法直接拼透明度，故返回半透明 rgba。 */
export function tintColor(color: string): string {
  if (color.startsWith('#')) return `${color}1A`;
  // CSS 变量场景：用黑底 10% 半透明近似（列表底色为白/浅灰，效果等同浅色遮罩）
  return 'rgba(0, 0, 0, 0.055)';
}

/* ================= Lucide key 图标体系 =================
 * 从分类管理表单保存起，分类的 icon 字段存「Lucide 组件导出名」（如 'Coffee'）。
 * 展示时统一走 resolveCategoryIcon：先查 icon 存的 key，老数据 emoji 再按名字映射。
 * 这样「存什么 icon 就显示什么」，不再出现选了 A 显示 B / 乱闪 Zap。
 */

/** Lucide 组件导出名 → 组件（可选项中实际提供的图标全集） */
const LUCIDE_BY_KEY: Record<string, LucideIcon> = {
  Utensils, Coffee, Cake, Beer, Pizza, Cookie, ShoppingBag, ShoppingCart,
  Shirt, Footprints, Car, Bus, TrainFront, Plane, Bike, Fuel, CircleParking,
  Home, Sofa, Lightbulb, Wrench, Sparkles, Gamepad2, Clapperboard,
  Music, Ticket, MonitorPlay, Dumbbell, BookOpen, GraduationCap, PenLine,
  HeartPulse, Stethoscope, Pill, PawPrint, Baby, Briefcase, Wallet,
  TrendingUp, PiggyBank, Gift, Phone, Tv, Camera, Smartphone, Globe, Package,
};

/** 图标选择分组（供选择器 UI 使用） */
export const ICON_CHOICES: { group: string; items: { key: string; label: string }[] }[] = [
  { group: '餐饮', items: [{ key: 'Utensils', label: '餐具' }, { key: 'Coffee', label: '咖啡' }, { key: 'Cake', label: '蛋糕' }, { key: 'Beer', label: '饮品' }, { key: 'Pizza', label: '外卖' }, { key: 'Cookie', label: '零食' }] },
  { group: '交通', items: [{ key: 'Car', label: '汽车' }, { key: 'Bus', label: '公交' }, { key: 'TrainFront', label: '火车' }, { key: 'Plane', label: '飞机' }, { key: 'Fuel', label: '加油' }, { key: 'Bike', label: '单车' }, { key: 'CircleParking', label: '停车' }] },
  { group: '购物', items: [{ key: 'ShoppingBag', label: '购物袋' }, { key: 'ShoppingCart', label: '购物车' }, { key: 'Shirt', label: '服饰' }, { key: 'Footprints', label: '鞋' }] },
  { group: '居家', items: [{ key: 'Home', label: '家' }, { key: 'Sofa', label: '沙发' }, { key: 'Lightbulb', label: '灯泡' }, { key: 'Wrench', label: '维修' }, { key: 'Sparkles', label: '清洁' }] },
  { group: '娱乐', items: [{ key: 'Gamepad2', label: '游戏' }, { key: 'Clapperboard', label: '影视' }, { key: 'Music', label: '音乐' }, { key: 'Ticket', label: '票券' }, { key: 'Camera', label: '相机' }, { key: 'Tv', label: '电视' }] },
  { group: '学习健康', items: [{ key: 'BookOpen', label: '书籍' }, { key: 'GraduationCap', label: '教育' }, { key: 'PenLine', label: '文具' }, { key: 'HeartPulse', label: '医疗' }, { key: 'Stethoscope', label: '药品' }, { key: 'Pill', label: '药丸' }, { key: 'Dumbbell', label: '健身' }, { key: 'PawPrint', label: '宠物' }, { key: 'Baby', label: '母婴' }] },
  { group: '收入', items: [{ key: 'Briefcase', label: '工资' }, { key: 'Wallet', label: '兼职' }, { key: 'TrendingUp', label: '理财' }, { key: 'PiggyBank', label: '存钱罐' }, { key: 'Gift', label: '礼物' }, { key: 'Phone', label: '话费' }, { key: 'Globe', label: '网络' }, { key: 'Package', label: '其他' }] },
];

/** 是否为可用的 Lucide key（用于校验 icon 字段） */
export function isLucideKey(v: string | null | undefined): boolean {
  return !!v && !!LUCIDE_BY_KEY[v];
}

/** 按 Lucide key 取组件（图标选择器等用），不存在返回 null */
export function getIconByKey(key: string): LucideIcon | null {
  return LUCIDE_BY_KEY[key] ?? null;
}

/** 统一图标解析：icon 存的 Lucide key > 兼容英文名 > 老 emoji 按名字映射 > Zap */
export function resolveCategoryIcon(cat: { icon?: string | null; name: string }): LucideIcon {
  const key = cat.icon ?? '';
  if (LUCIDE_BY_KEY[key]) return LUCIDE_BY_KEY[key];
  if (/^[a-zA-Z]+$/.test(key)) return LUCIDE_BY_KEY[key] ?? Zap; // 兼容旧代码存过英文 key
  return getCategoryIcon(cat.name) ?? Zap;
}
