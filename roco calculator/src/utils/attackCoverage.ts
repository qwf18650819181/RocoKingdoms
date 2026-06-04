import type { SkillCatalogMap } from "../types/skillScore";
import type { TypeEffectivenessData } from "../types/typeEffectiveness";
import { getTypeMultiplier } from "./typeEffectiveness";

const ATTACK_CATEGORIES = new Set(["物攻", "魔攻"]);
const NON_COVERAGE_CATEGORIES = new Set(["状态", "防御"]);

/** 是否参与 PVP 打击面统计（仅物攻/魔攻） */
export function isCoverageAttackSkill(
  meta?: { category?: string | null; attr?: string | null } | null,
): boolean {
  if (!meta?.attr) return false;
  const category = meta.category ?? "";
  if (NON_COVERAGE_CATEGORIES.has(category)) return false;
  return ATTACK_CATEGORIES.has(category);
}

/** 该攻击属性可打出 ≥2 倍伤害的防御属性（去重） */
export function getAttackTypeCoverage(
  attackAttr: string,
  data: TypeEffectivenessData,
): string[] {
  const hits: string[] = [];
  for (const defend of data.attributes) {
    if (getTypeMultiplier(data, attackAttr, defend) >= 2) {
      hits.push(defend);
    }
  }
  return hits;
}

export interface AttackCoverageLine {
  attack: string;
  targets: string[];
}

/** 由已选攻击技能汇总各攻击系打击面（同系合并，不重复） */
export function getAttackCoverageFromSkills(
  skillNames: (string | null)[],
  catalog: SkillCatalogMap,
  data: TypeEffectivenessData,
): AttackCoverageLine[] {
  const byAttack = new Map<string, Set<string>>();

  for (const name of skillNames) {
    if (!name) continue;
    const meta = catalog[name];
    if (!isCoverageAttackSkill(meta)) continue;
    const attr = meta!.attr!;

    let set = byAttack.get(attr);
    if (!set) {
      set = new Set<string>();
      byAttack.set(attr, set);
    }
    for (const target of getAttackTypeCoverage(attr, data)) {
      set.add(target);
    }
  }

  return [...byAttack.entries()]
    .map(([attack, targets]) => ({
      attack,
      targets: [...targets].sort((a, b) =>
        data.attributes.indexOf(a) - data.attributes.indexOf(b),
      ),
    }))
    .sort((a, b) => data.attributes.indexOf(a.attack) - data.attributes.indexOf(b.attack));
}

export function flattenCoverageTargets(
  lines: AttackCoverageLine[],
  attrOrder?: string[],
): string[] {
  const all = new Set<string>();
  for (const line of lines) {
    for (const t of line.targets) all.add(t);
  }
  const list = [...all];
  if (attrOrder) {
    list.sort((a, b) => attrOrder.indexOf(a) - attrOrder.indexOf(b));
  } else {
    list.sort();
  }
  return list;
}

export function getMissingCoverage(
  covered: string[],
  data: TypeEffectivenessData,
): string[] {
  const hit = new Set(covered);
  return data.attributes.filter((attr) => !hit.has(attr));
}

export function formatCoverageLine(line: AttackCoverageLine): string {
  if (line.targets.length === 0) return `${line.attack}:—`;
  return `${line.attack}:${line.targets.join("+")}`;
}
