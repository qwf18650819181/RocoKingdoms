export interface Spirit {
  id: number;
  编号: string;
  序号: number;
  名称: string;
  页面标题: string;
  精灵阶段: string;
  主属性: string;
  副属性: string | null;
  特性: string | null;
  特性描述: string | null;
  生命: number;
  物攻: number;
  魔攻: number;
  物防: number;
  魔防: number;
  速度: number;
  种族值总和: number;
  回顾: number | null;
  星光值: number | null;
  是否有异色: string | null;
  初阶名称: string | null;
  地区形态: string | null;
  进化条件: string | null;
  体型: string | null;
  重量: string | null;
  分布地区: string | null;
  蛋组: string | null;
  更新版本: string | null;
  页面链接: string;
  立绘链接: string;
  立绘路径: string;
}

export interface IconRecord {
  id: number;
  分类: string;
  名称: string;
  图标链接: string;
  图标路径: string;
}

export const STAT_KEYS = [
  "生命",
  "物攻",
  "魔攻",
  "物防",
  "魔防",
  "速度",
] as const;

export type StatKey = (typeof STAT_KEYS)[number];

export const SKILL_SOURCES = ["默认", "血脉", "技能石"] as const;
export type SkillSource = (typeof SKILL_SOURCES)[number];

export interface SpiritSkillEntry {
  name: string;
  level?: number;
  /** 技能属性，对应 attribute_icons.json 的键 */
  attr?: string;
}

export type AttributeIconMap = Record<string, string>;

export type SpiritSkills = Record<SkillSource, SpiritSkillEntry[]>;

export type SpiritSortKey = "id" | "name" | "种族值总和" | StatKey;

export const SORT_OPTIONS: { value: SpiritSortKey; label: string }[] = [
  { value: "id", label: "编号" },
  { value: "name", label: "名称" },
  { value: "种族值总和", label: "种族值总和" },
  { value: "生命", label: "生命" },
  { value: "物攻", label: "物攻" },
  { value: "魔攻", label: "魔攻" },
  { value: "物防", label: "物防" },
  { value: "魔防", label: "魔防" },
  { value: "速度", label: "速度" },
];
