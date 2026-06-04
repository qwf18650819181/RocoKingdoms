export const ATTRIBUTE_COLORS: Record<string, string> = {
  普通: "#a8a878",
  草: "#78c850",
  火: "#f08030",
  水: "#6890f0",
  光: "#f8d030",
  地: "#e0c068",
  冰: "#98d8d8",
  龙: "#7038f8",
  电: "#f8d030",
  毒: "#a040a0",
  虫: "#a8b820",
  武: "#c03028",
  翼: "#a890f0",
  萌: "#ee99ac",
  幽: "#705898",
  恶: "#705848",
  机械: "#b8b8d0",
  幻: "#ee99ac",
};

export const ALL_ATTRIBUTES = Object.keys(ATTRIBUTE_COLORS);

/** 打击面等紧凑展示用单字 */
export const ATTR_SHORT: Record<string, string> = {
  普通: "普",
  草: "草",
  火: "火",
  水: "水",
  光: "光",
  地: "地",
  冰: "冰",
  龙: "龙",
  电: "电",
  毒: "毒",
  虫: "虫",
  武: "武",
  翼: "翼",
  萌: "萌",
  幽: "幽",
  恶: "恶",
  机械: "机",
  幻: "幻",
};

export function attrShortLabel(attr: string): string {
  return ATTR_SHORT[attr] ?? attr.slice(0, 1);
}

/** 属性色块上的文字颜色（浅底用深色字） */
export function attrLabelTextColor(bg: string): string {
  const light = new Set(["#f8d030", "#98d8d8", "#ee99ac", "#b8b8d0", "#e0c068"]);
  return light.has(bg) ? "#1a2332" : "#ffffff";
}
