import type { Spirit } from "../types/spirit";
import type { SpiritSkillEntry } from "../types/spirit";
import type {
  SkillCatalogEntry,
  SkillCatalogMap,
  SkillScoreReason,
  SkillScoreResult,
  SpiritRoleTag,
} from "../types/skillScore";
import type { TypeEffectivenessData } from "../types/typeEffectiveness";
import {
  getSpiritThreatAttackTypes,
  getTypeMultiplier,
} from "./typeEffectiveness";

const ATTACK_CATEGORIES = new Set(["物攻", "魔攻"]);
const MARK_PATTERN = /印记/;
const INTERRUPT_PATTERN = /打断|中断/;

function skillMetaText(meta?: SkillCatalogEntry | null): string {
  return [meta?.description, meta?.effect].filter(Boolean).join(" ");
}

/** 可联动属性克制图的技能属性（仅物攻、魔攻） */
export function getSkillTypeChartAttr(
  skillName: string,
  catalog: SkillCatalogMap,
  attr?: string | null,
  category?: string | null,
): string | null {
  const meta = catalog[skillName];
  const cat = category ?? meta?.category ?? null;
  if (!cat || !ATTACK_CATEGORIES.has(cat)) return null;
  return attr ?? meta?.attr ?? null;
}

/** 技能列表展示用：优先效果，其次描述 */
export function getSkillDisplayText(
  catalog: SkillCatalogMap,
  skillName: string,
): string | null {
  const meta = catalog[skillName];
  if (!meta) return null;
  return meta.effect || meta.description || null;
}

export function getSkillEnergyPower(
  meta?: SkillCatalogEntry | null,
): { energy: number | null; power: number | null } {
  if (!meta) return { energy: null, power: null };
  const energy = meta.energy ?? (meta as { 耗能?: number }).耗能 ?? null;
  const power = meta.power ?? (meta as { 威力?: number }).威力 ?? null;
  return { energy, power };
}

export function formatSkillEnergy(meta?: SkillCatalogEntry | null): string | null {
  const { energy } = getSkillEnergyPower(meta);
  return energy != null ? `耗${energy}` : null;
}

export function formatSkillPower(meta?: SkillCatalogEntry | null): string | null {
  const { power } = getSkillEnergyPower(meta);
  return power != null ? `威${power}` : null;
}

export function formatSkillEnergyPower(
  meta?: SkillCatalogEntry | null,
): string | null {
  const { energy, power } = getSkillEnergyPower(meta);
  const parts: string[] = [];
  if (energy != null) parts.push(`耗${energy}`);
  if (power != null) parts.push(`威${power}`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** 搜索用：名称 + 效果 + 描述（全部参与匹配） */
export function normalizeSkillSearchText(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .toLowerCase();
}

export function getSkillSearchHaystack(
  catalog: SkillCatalogMap,
  skillName: string,
): string {
  const meta = catalog[skillName];
  if (!meta) return normalizeSkillSearchText(skillName);
  return normalizeSkillSearchText(
    [skillName, meta.effect, meta.description, meta.attr, meta.category]
      .filter(Boolean)
      .join(" "),
  );
}

/** 状态技能：描述或效果含「印记」 */
export function isStatusMarkByDescription(meta?: SkillCatalogEntry | null): boolean {
  return MARK_PATTERN.test(skillMetaText(meta));
}

/** 状态技能：描述或效果含「打断/中断」 */
export function isStatusInterruptByDescription(meta?: SkillCatalogEntry | null): boolean {
  return INTERRUPT_PATTERN.test(skillMetaText(meta));
}

/**
 * 技能属性是否克制「克制本精灵」的属性系别。
 * 例：光系被草、幽克制 → 威胁系为草、幽；火系技能打草系为 2 倍则命中。
 */
export function skillCountersSpiritThreats(
  skillAttr: string | null | undefined,
  spirit: Spirit,
  typeData: TypeEffectivenessData,
): { matched: boolean; label: string } {
  if (!skillAttr) {
    return { matched: false, label: "" };
  }

  const threats = getSpiritThreatAttackTypes(spirit, typeData);
  if (threats.length === 0) {
    return { matched: false, label: "" };
  }

  const hits: string[] = [];
  for (const threat of threats) {
    if (getTypeMultiplier(typeData, skillAttr, threat) >= 2) {
      hits.push(threat);
    }
  }

  if (hits.length === 0) {
    return { matched: false, label: "" };
  }

  return {
    matched: true,
    label: `克威胁${hits.join("")}`,
  };
}

function scoreAttackSkill(
  category: string,
  skillAttr: string | null,
  spirit: Spirit,
  tags: SpiritRoleTag[],
  typeData: TypeEffectivenessData | null,
): SkillScoreResult {
  const reasons: SkillScoreReason[] = [{ label: "基础", multiplier: 1 }];
  let score = 1;

  if (tags.includes("物攻") && category === "物攻") {
    reasons.push({ label: "物攻匹配", multiplier: 2 });
    score *= 2;
  } else if (tags.includes("物攻") && category === "魔攻") {
    reasons.push({ label: "物魔错位", multiplier: 0.5 });
    score *= 0.5;
  }

  if (tags.includes("魔攻") && category === "魔攻") {
    reasons.push({ label: "魔攻匹配", multiplier: 2 });
    score *= 2;
  } else if (tags.includes("魔攻") && category === "物攻") {
    reasons.push({ label: "魔物错位", multiplier: 0.5 });
    score *= 0.5;
  }

  if (typeData) {
    const counter = skillCountersSpiritThreats(skillAttr, spirit, typeData);
    if (counter.matched) {
      reasons.push({ label: counter.label, multiplier: 2 });
      score *= 2;
    }
  }

  return { score, reasons, skipped: false };
}

function scoreStatusSkill(meta?: SkillCatalogEntry | null): SkillScoreResult {
  const hasMark = isStatusMarkByDescription(meta);
  const hasInterrupt = isStatusInterruptByDescription(meta);

  if (!hasMark && !hasInterrupt) {
    return {
      score: 0,
      reasons: [],
      skipped: true,
      skipReason: "状态无印记/打断",
    };
  }

  const reasons: SkillScoreReason[] = [{ label: "基础", multiplier: 1 }];
  let score = 1;

  if (hasMark) {
    reasons.push({ label: "印记", multiplier: 4 });
    score *= 4;
  }
  if (hasInterrupt) {
    reasons.push({ label: "打断", multiplier: 4 });
    score *= 4;
  }

  return { score, reasons, skipped: false };
}

export function scoreSpiritSkill(
  skill: SpiritSkillEntry,
  catalog: SkillCatalogMap,
  spirit: Spirit,
  tags: SpiritRoleTag[],
  typeData: TypeEffectivenessData | null,
): SkillScoreResult {
  const meta = catalog[skill.name];
  const category = meta?.category ?? "";
  const skillAttr = skill.attr ?? meta?.attr ?? null;

  if (category === "防御") {
    return {
      score: 0,
      reasons: [],
      skipped: true,
      skipReason: "防御不计分",
    };
  }

  if (category === "状态") {
    return scoreStatusSkill(meta);
  }

  if (!ATTACK_CATEGORIES.has(category)) {
    return {
      score: 0,
      reasons: [],
      skipped: true,
      skipReason: category ? `未知类别${category}` : "无类别",
    };
  }

  return scoreAttackSkill(category, skillAttr, spirit, tags, typeData);
}
