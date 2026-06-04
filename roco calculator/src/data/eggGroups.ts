/** 蛋组顺序（与 roco spider 蛋组计算器一致） */
export const EGG_GROUP_ORDER = [
  "无法孵蛋",
  "动物组",
  "拟人组",
  "巨灵组",
  "魔力组",
  "天空组",
  "两栖组",
  "植物组",
  "大地组",
  "妖精组",
  "昆虫组",
  "软体组",
  "机械组",
  "海洋组",
  "龙组",
] as const;

export type EggGroupName = (typeof EGG_GROUP_ORDER)[number];

/** 筛选按钮展示用单字 */
export const EGG_GROUP_SHORT: Record<EggGroupName, string> = {
  无法孵蛋: "无",
  动物组: "动",
  拟人组: "拟",
  巨灵组: "巨",
  魔力组: "魔",
  天空组: "天",
  两栖组: "两",
  植物组: "植",
  大地组: "地",
  妖精组: "妖",
  昆虫组: "虫",
  软体组: "软",
  机械组: "机",
  海洋组: "海",
  龙组: "龙",
};
