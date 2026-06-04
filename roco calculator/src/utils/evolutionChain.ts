import type { Spirit } from "../types/spirit";
import { compareStages, normalizeStage, spiritLineKey } from "./normalize";

/** 同一条进化线（初阶名称 + 地区形态）上的全部阶段，按进化顺序排列 */
export function buildEvolutionChain(
  spirit: Spirit,
  pool: readonly Spirit[],
): Spirit[] {
  const key = spiritLineKey(spirit);
  const chain = pool.filter((s) => spiritLineKey(s) === key);
  if (chain.length <= 1) return chain;

  const seen = new Set<number>();
  const unique: Spirit[] = [];
  for (const s of chain) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    unique.push(s);
  }

  unique.sort((a, b) => {
    const stageCmp = compareStages(
      normalizeStage(a.精灵阶段),
      normalizeStage(b.精灵阶段),
    );
    if (stageCmp !== 0) return stageCmp;
    return a.序号 - b.序号;
  });

  return unique;
}
