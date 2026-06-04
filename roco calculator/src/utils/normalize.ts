/** 与 import_data 阶段规则保持一致 */
const STAGE_ALIASES: Record<string, string> = {
  I阶: "Ⅰ阶",
  II阶: "Ⅱ阶",
  "1阶": "Ⅰ阶",
  "2阶": "Ⅱ阶",
  一阶: "Ⅰ阶",
  二阶: "Ⅱ阶",
  III阶: "最终阶段",
  "3阶": "最终阶段",
  三阶: "最终阶段",
  "Ⅲ阶": "最终阶段",
  最终形态: "最终阶段",
  最终阶段: "最终阶段",
};

export const FINAL_STAGE_LABEL = "最终阶段";

/** 同编号+地区形态进化链上，序号间隔超过此值视为分支最终（如岚鸟 vs 霜翼领主） */
const EVOLUTION_SERIAL_GAP = 11;

export function normalizeStage(stage: string | null | undefined): string {
  if (!stage) return "";
  const text = stage.replace(/\s+/g, "").trim();
  return STAGE_ALIASES[text] ?? text;
}

/** 同一初阶+地区形态为一条进化链（编号会随阶段变化，如 018→019→020） */
export function spiritLineKey(spirit: {
  编号: string | number;
  初阶名称?: string | null;
  地区形态?: string | null;
}): string {
  const form = spirit.地区形态?.trim() || "default";
  const starter = spirit.初阶名称?.trim();
  if (starter) return `line|${starter}|${form}`;
  return `dex|${spirit.编号}|${form}`;
}

const NON_FINAL_MOLT_NAMES = ["板板壳", "咔咔壳"] as const;

export type SpiritStageRow = {
  序号: number;
  编号: string | number;
  名称: string;
  页面标题?: string;
  初阶名称?: string | null;
  地区形态?: string | null;
  精灵阶段: string;
};

function sameEvolutionBranch(a: SpiritStageRow, b: SpiritStageRow): boolean {
  return spiritLineKey(a) === spiritLineKey(b);
}

/** Wiki 把中间形态误标为最终阶段（如雪绒鸟/冬羽雀的季节形态） */
export function isSupersededFinalMislabel(
  spirit: SpiritStageRow,
  lineGroup: readonly SpiritStageRow[],
): boolean {
  if (normalizeStage(spirit.精灵阶段) !== FINAL_STAGE_LABEL) return false;

  for (const later of lineGroup) {
    if (later.序号 <= spirit.序号) continue;
    if (later.名称 === spirit.名称) continue;
    if (normalizeStage(later.精灵阶段) !== FINAL_STAGE_LABEL) continue;
    if (!sameEvolutionBranch(spirit, later)) continue;
    const gap = later.序号 - spirit.序号;
    if (gap > EVOLUTION_SERIAL_GAP) continue;
    // 同线并列最终（如翠顶夫人 / 黑羽夫人）编号不同，不应互相隐藏
    if (String(spirit.编号) !== String(later.编号)) continue;
    return true;
  }
  return false;
}

export function isVariantFinalSerial(
  serial: number,
  serialToStage: ReadonlyMap<number, string>,
): boolean {
  if (serial % 10 !== 1) return false;
  const base = Math.floor(serial / 10);
  return serialToStage.get(base) === FINAL_STAGE_LABEL;
}

export function resolveSpiritStage(
  spirit: SpiritStageRow,
  serialToStage: ReadonlyMap<number, string>,
): string {
  const stage = normalizeStage(spirit.精灵阶段);

  if (isVariantFinalSerial(spirit.序号, serialToStage)) {
    return FINAL_STAGE_LABEL;
  }

  return stage;
}

/** 按进化线修正误标的最终阶段（导入与前端共用逻辑） */
export function applyEvolutionLineStageFix<T extends SpiritStageRow>(
  spirits: T[],
): T[] {
  const groups = new Map<string, T[]>();
  for (const s of spirits) {
    const key = spiritLineKey(s);
    const list = groups.get(key);
    if (list) list.push(s);
    else groups.set(key, [s]);
  }

  return spirits.map((spirit) => {
    const group = groups.get(spiritLineKey(spirit)) ?? [spirit];
    if (!isSupersededFinalMislabel(spirit, group)) return spirit;
    const down =
      normalizeStage(spirit.精灵阶段) === FINAL_STAGE_LABEL ? "Ⅱ阶" : spirit.精灵阶段;
    return { ...spirit, 精灵阶段: down };
  });
}

/** 图鉴列表：进化线终端 + 特殊变体（圣光迪莫等） */
export function isDisplayFinalSpirit(
  spirit: SpiritStageRow,
  lineGroup: readonly SpiritStageRow[],
): boolean {
  if (normalizeStage(spirit.精灵阶段) !== FINAL_STAGE_LABEL) return false;
  if (
    spirit.地区形态 === "蜕皮时的样子" &&
    (NON_FINAL_MOLT_NAMES as readonly string[]).includes(spirit.名称)
  ) {
    return false;
  }
  if (isSupersededFinalMislabel(spirit, lineGroup)) return false;
  return true;
}

export const STAGE_SORT_ORDER = [
  "Ⅰ阶",
  "Ⅱ阶",
  "最终阶段",
  "超越阶段",
] as const;

export function compareStages(a: string, b: string): number {
  const ai = STAGE_SORT_ORDER.indexOf(a as (typeof STAGE_SORT_ORDER)[number]);
  const bi = STAGE_SORT_ORDER.indexOf(b as (typeof STAGE_SORT_ORDER)[number]);
  const ar = ai === -1 ? 99 : ai;
  const br = bi === -1 ? 99 : bi;
  if (ar !== br) return ar - br;
  return a.localeCompare(b, "zh-CN");
}
