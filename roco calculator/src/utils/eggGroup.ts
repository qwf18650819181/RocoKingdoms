import type { Spirit } from "../types/spirit";
import { spiritLineKey } from "./normalize";

/** 同进化链共享蛋组：若最终形态未标注，继承链内其它阶段的蛋组 */
export function applyEggGroupInheritance(spirits: Spirit[]): Spirit[] {
  const lineEgg = new Map<string, string>();
  for (const s of spirits) {
    if (!s.蛋组) continue;
    const key = spiritLineKey(s);
    if (!lineEgg.has(key)) lineEgg.set(key, s.蛋组);
  }
  return spirits.map((s) => {
    const inherited = lineEgg.get(spiritLineKey(s));
    if (!inherited || s.蛋组 === inherited) return s;
    return { ...s, 蛋组: inherited };
  });
}

export function resolveSpiritEggGroup(spirit: Spirit): string | null {
  return spirit.蛋组 ?? null;
}
