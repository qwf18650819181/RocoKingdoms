/** 精灵定位标签（由种族值与特性推导） */
export type SpiritRoleTag =
  | "物攻"
  | "魔攻"
  | "物防"
  | "魔防"
  | "快速"
  | "生命"
  | "超新星";

export interface SkillCatalogEntry {
  category: string | null;
  attr: string | null;
  effect: string | null;
  description: string | null;
  energy: number | null;
  power: number | null;
}

export type SkillCatalogMap = Record<string, SkillCatalogEntry>;

export interface SkillScoreReason {
  label: string;
  multiplier: number;
}

export interface SkillScoreResult {
  score: number;
  reasons: SkillScoreReason[];
  skipped: boolean;
  skipReason?: string;
}

export interface ScoredSpiritSkill {
  name: string;
  level?: number;
  attr?: string;
  score: SkillScoreResult;
}
