/** 与 public/data/type_effectiveness.json 结构一致 */

export type TypeEffectRelationKey =
  | "strong"
  | "resist"
  | "weak"
  | "vulnerable";

export interface TypeEffectGroups {
  strong: string[];
  resist: string[];
  weak: string[];
  vulnerable: string[];
}

export interface TypeEffectivenessData {
  attributes: string[];
  /** 以该属性为视角的克制关系（与 BWIKI 克制计算器一致） */
  chart: Record<string, TypeEffectGroups>;
  /** 攻击属性 → 防御属性 → 倍率（仅非 1.0 条目） */
  matchups: Record<string, Record<string, number>>;
}
