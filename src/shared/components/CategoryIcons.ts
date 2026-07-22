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
  type LucideIcon,
} from 'lucide-react';

/** category name → Lucide SVG icon */
const NAME_TO_ICON: Record<string, LucideIcon> = {
  餐饮: Utensils, 早餐: Coffee, 午餐: Utensils, 晚餐: Utensils, 零食: Coffee,
  饮料: Coffee, 外卖: ShoppingBag,
  购物: ShoppingBag, 日用: ShoppingBag, 日用品: ShoppingBag, 数码: Smartphone, 服饰: Shirt,
  交通: Car, 公交: Bus, 地铁: Bus, 打车: Car, 加油: Car, 停车: Car,
  娱乐: Gamepad2, 电影: MonitorPlay, 游戏: Gamepad2, 旅行: Plane, 音乐: Music,
  居家: Home, 房租: Home, 房贷: Home, 水电: Zap, 维修: Wrench, 家具: Home,
  医疗: HeartPulse, 药品: Stethoscope,
  通讯: Smartphone,
  礼品: Gift,
  学习: BookOpen, 教育: GraduationCap,
  宠物: Cat,
  健身: Dumbbell,
  工资: Briefcase, 兼职: Wallet, 理财: TrendingUp, 投资: TrendingUp, 退款: RotateCcw, 奖金: Banknote,
  其他: Zap,
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
    饮料: '#E07B6C', 外卖: '#E07B6C',
    购物: '#F0A060', 日用: '#F0A060', 日用品: '#F0A060', 数码: '#5B8DEF', 服饰: '#D070A0',
    交通: '#6CB4EE', 公交: '#6CB4EE', 地铁: '#6CB4EE', 打车: '#6CB4EE', 停车: '#6CB4EE',
    娱乐: '#A78BFA', 电影: '#A78BFA', 游戏: '#A78BFA', 旅行: '#60C0D0', 音乐: '#A78BFA',
    居家: '#94A3B8', 房租: '#94A3B8', 房贷: '#94A3B8', 水电: '#F5B041', 维修: '#94A3B8', 家具: '#94A3B8',
    医疗: '#F08080', 药品: '#F08080',
    通讯: '#5B8DEF',
    礼品: '#F08080',
    学习: '#7DBE7D', 教育: '#7DBE7D',
    工资: '#5FBB97', 兼职: '#5FBB97', 理财: '#5FBB97', 投资: '#5FBB97', 奖金: '#5FBB97',
  };
  return map[name] ?? '#94A3B8';
}
