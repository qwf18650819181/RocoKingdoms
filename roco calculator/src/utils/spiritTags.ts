import { normalizeStage } from "./normalize";
import type { Spirit, StatKey } from "../types/spirit";
import { STAT_KEYS } from "../types/spirit";
import type { SpiritRoleTag } from "../types/skillScore";

const FINAL_STAGE = "最终阶段";
const TOP_PERCENT = 0.4;

export const STAT_TAG_MAP: Record<StatKey, SpiritRoleTag> = {
  生命: "生命",
  物攻: "物攻",
  魔攻: "魔攻",
  物防: "物防",
  魔防: "魔防",
  速度: "快速",
};

export interface StatThresholds {
  byStat: Record<StatKey, number>;
  /** 种族值总和前 30% 门槛（超新星） */
  totalBst: number;
  sampleCount: number;
}

function isFinalForm(spirit: Spirit): boolean {
  return normalizeStage(spirit.精灵阶段) === FINAL_STAGE;
}

function hasBattleStats(spirit: Spirit): boolean {
  return spirit.种族值总和 > 0 && STAT_KEYS.every((k) => spirit[k] > 0);
}

function topPercentThreshold(values: number[]): number {
  if (values.length === 0) return Infinity;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(0, Math.ceil(sorted.length * (1 - TOP_PERCENT)) - 1);
  return sorted[rank];
}

/** 基于全部最终形态精灵，计算各单项种族值与总和的前 30% 门槛（≥ 门槛即达标） */
export function buildStatThresholds(spirits: Spirit[]): StatThresholds {
  const finals = spirits.filter((s) => isFinalForm(s) && hasBattleStats(s));
  const byStat = {} as Record<StatKey, number>;

  for (const key of STAT_KEYS) {
    byStat[key] = topPercentThreshold(finals.map((s) => s[key]));
  }

  const totalBst = topPercentThreshold(finals.map((s) => s.种族值总和));

  return { byStat, totalBst, sampleCount: finals.length };
}

export function computeSpiritTags(
  spirit: Spirit,
  thresholds: StatThresholds,
): SpiritRoleTag[] {
  const tags: SpiritRoleTag[] = [];

  for (const key of STAT_KEYS) {
    if (spirit[key] >= thresholds.byStat[key]) {
      tags.push(STAT_TAG_MAP[key]);
    }
  }

  if (spirit.种族值总和 >= thresholds.totalBst) {
    tags.push("超新星");
  }

  return tags;
}

export function formatTagThresholdHint(
  tag: SpiritRoleTag,
  thresholds: StatThresholds,
): string {
  if (tag === "超新星") {
    return `种族值总和≥${thresholds.totalBst}（最终形态前${TOP_PERCENT * 100}%）`;
  }
  const statKey = (Object.entries(STAT_TAG_MAP).find(([, t]) => t === tag)?.[0] ??
    null) as StatKey | null;
  if (!statKey) return "";
  return `${statKey}≥${thresholds.byStat[statKey]}（最终形态前${TOP_PERCENT * 100}%）`;
}
