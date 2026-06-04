import { ATTRIBUTE_COLORS } from "../data/attributes";
import type { TypeEffectivenessData } from "../types/typeEffectiveness";
import { getCombinedDefendMultiplier } from "./typeEffectiveness";

export interface TypeChartArrowLink {
  from: string;
  to: string;
  color: string;
  side: "left" | "right";
}

export interface MergedTypeChart {
  counters: Set<string>;
  /** 左侧：每个选中属性单独都在 weak 列表中（双属共克，显示 ×2） */
  counterDualWeak: Set<string>;
  countered: Set<string>;
  linksLeft: TypeChartArrowLink[];
  linksRight: TypeChartArrowLink[];
}

/** 攻击属性是否同时克制所有选中的防御属性（各属性 weak 列表均包含该攻击） */
export function isAttackWeakAgainstAll(
  typeEffectiveness: TypeEffectivenessData,
  attack: string,
  defendAttrs: string[],
): boolean {
  if (defendAttrs.length < 2) return false;
  return defendAttrs.every(
    (defend) => typeEffectiveness.chart[defend]?.weak.includes(attack) ?? false,
  );
}

const SUPER_EFFECTIVE = 2;

export function mergeTypeChartRelations(
  typeEffectiveness: TypeEffectivenessData,
  centerAttrs: string[],
): MergedTypeChart {
  const counters = new Set<string>();
  const counterDualWeak = new Set<string>();
  const countered = new Set<string>();
  const linksLeft: TypeChartArrowLink[] = [];
  const linksRight: TypeChartArrowLink[] = [];

  if (centerAttrs.length === 0) {
    return { counters, counterDualWeak, countered, linksLeft, linksRight };
  }

  for (const attack of typeEffectiveness.attributes) {
    const mult = getCombinedDefendMultiplier(
      typeEffectiveness,
      attack,
      centerAttrs,
    );
    if (mult < SUPER_EFFECTIVE) continue;
    counters.add(attack);
    if (isAttackWeakAgainstAll(typeEffectiveness, attack, centerAttrs)) {
      counterDualWeak.add(attack);
    }
    for (const center of centerAttrs) {
      linksLeft.push({
        from: attack,
        to: center,
        color: ATTRIBUTE_COLORS[center] ?? "#888",
        side: "left",
      });
    }
  }

  for (const center of centerAttrs) {
    const groups = typeEffectiveness.chart[center];
    if (!groups) continue;
    const color = ATTRIBUTE_COLORS[center] ?? "#888";
    for (const to of groups.strong) {
      countered.add(to);
      linksRight.push({ from: center, to, color, side: "right" });
    }
  }

  return { counters, counterDualWeak, countered, linksLeft, linksRight };
}
