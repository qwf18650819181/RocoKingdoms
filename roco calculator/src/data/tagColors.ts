import type { SpiritRoleTag } from "../types/skillScore";

export interface TagColorStyle {
  bg: string;
  text: string;
  border: string;
}

/** 定位标签配色：生命绿 / 物攻红 / 魔攻蓝 / 物防铜 / 魔防紫 / 速度金 */
export const ROLE_TAG_COLORS: Record<SpiritRoleTag, TagColorStyle> = {
  生命: { bg: "#2d8a4e", text: "#ffffff", border: "#1f6b3a" },
  物攻: { bg: "#c43d3d", text: "#ffffff", border: "#9a2f2f" },
  魔攻: { bg: "#2d6cdf", text: "#ffffff", border: "#2458b8" },
  物防: { bg: "#b87333", text: "#ffffff", border: "#8f5a28" },
  魔防: { bg: "#7b5ea7", text: "#ffffff", border: "#5f4785" },
  快速: { bg: "#d4a017", text: "#1a1200", border: "#a67b10" },
  超新星: { bg: "#e6b422", text: "#1a1200", border: "#b88c12" },
};
