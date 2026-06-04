import type { TypeEffectivenessData } from "../types/typeEffectiveness";

/**
 * 攻击属性 → 防御属性 伤害倍率（与 BWIKI 克制表一致，优先读 chart）。
 * - 防御方 weak：该攻击属性对防御方 2.0
 * - 防御方 vulnerable：0.5
 * - 攻击方 strong：2.0
 * - 攻击方 resist：0.5
 */
export function getTypeMultiplier(
  data: TypeEffectivenessData,
  attack: string,
  defend: string,
): number {
  const defChart = data.chart[defend];
  if (defChart?.weak.includes(attack)) return 2;
  if (defChart?.vulnerable.includes(attack)) return 0.5;

  const atkChart = data.chart[attack];
  if (atkChart?.strong.includes(defend)) return 2;
  if (atkChart?.resist.includes(defend)) return 0.5;

  return data.matchups[attack]?.[defend] ?? 1;
}

/** 能对精灵属性造成克制（≥2 倍）的攻击属性系别 */
export function getSpiritThreatAttackTypes(
  spirit: { 主属性: string; 副属性: string | null },
  data: TypeEffectivenessData,
): string[] {
  const defendAttrs = [spirit.主属性, spirit.副属性].filter(Boolean) as string[];
  const threats = new Set<string>();

  for (const attack of data.attributes) {
    for (const defend of defendAttrs) {
      if (getTypeMultiplier(data, attack, defend) >= 2) {
        threats.add(attack);
      }
    }
  }
  return [...threats];
}

/** 防御方 1～N 个属性时，受到某攻击属性的伤害倍率（≥2 为被克制） */
export function getCombinedDefendMultiplier(
  data: TypeEffectivenessData,
  attack: string,
  defendAttrs: string[],
): number {
  if (defendAttrs.length === 0) return 1;
  if (defendAttrs.length === 1) {
    return getTypeMultiplier(data, attack, defendAttrs[0]);
  }
  if (defendAttrs.length === 2) {
    return getDualDefendMultiplier(
      data,
      attack,
      defendAttrs[0],
      defendAttrs[1],
    );
  }
  return defendAttrs.reduce(
    (acc, defend) => acc * getTypeMultiplier(data, attack, defend),
    1,
  );
}

/** 双属性防御（主+副）合并倍率，规则与 BWIKI 克制计算器一致 */
export function getDualDefendMultiplier(
  data: TypeEffectivenessData,
  attack: string,
  mainDefend: string,
  subDefend?: string | null,
): number {
  if (!subDefend || subDefend === mainDefend) {
    return getTypeMultiplier(data, attack, mainDefend);
  }

  const main = data.chart[mainDefend];
  const sub = data.chart[subDefend];
  if (!main || !sub) {
    return (
      getTypeMultiplier(data, attack, mainDefend) *
      getTypeMultiplier(data, attack, subDefend)
    );
  }

  const weakHits = [main.weak.includes(attack), sub.weak.includes(attack)].filter(
    Boolean,
  ).length;
  const vulnHits = [
    main.vulnerable.includes(attack),
    sub.vulnerable.includes(attack),
  ].filter(Boolean).length;

  if (weakHits && vulnHits) return 1;
  if (weakHits === 2) return 3;
  if (weakHits === 1) return 2;
  if (vulnHits === 2) return 0.25;
  if (vulnHits === 1) return 0.5;
  return 1;
}
