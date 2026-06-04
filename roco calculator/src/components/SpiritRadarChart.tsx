import { useMemo } from "react";
import type { StatKey } from "../types/spirit";
import type { Spirit } from "../types/spirit";
import type { SpiritRoleTag } from "../types/skillScore";

const TAG_BY_STAT: Partial<Record<StatKey, SpiritRoleTag>> = {
  生命: "生命",
  物攻: "物攻",
  魔攻: "魔攻",
  物防: "物防",
  魔防: "魔防",
  速度: "快速",
};

/** 顺时针顶点顺序（与六边形外轮廓一致，避免折线交叉） */
const POLYGON_ORDER: StatKey[] = [
  "生命",
  "魔攻",
  "魔防",
  "速度",
  "物防",
  "物攻",
];

const STAT_SHORT: Record<StatKey, string> = {
  生命: "生",
  物攻: "物",
  魔攻: "魔",
  物防: "防",
  魔防: "魔防",
  速度: "速",
};

/** 各顶点角度（度）：上 → 右上 → 右下 → 下 → 左下 → 左上 */
const STAT_ANGLE: Record<StatKey, number> = {
  生命: -90,
  魔攻: -30,
  魔防: 30,
  速度: 90,
  物防: 150,
  物攻: -150,
};

/** 雷达图各属性刻度上限 */
export const RADAR_STAT_MAX = 200;

const SIZE = 200;
const PAD = 32;
const CENTER = SIZE / 2;
const RADIUS = CENTER - PAD;
const ICON_RADIUS = RADIUS + 14;

function polarPoint(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(rad),
    y: CENTER + radius * Math.sin(rad),
  };
}

function toPointStr(x: number, y: number): string {
  return `${x},${y}`;
}

interface Props {
  spirit: Spirit;
  spiritTags: SpiritRoleTag[];
  statIcons: Record<string, string>;
}

export function SpiritRadarChart({
  spirit,
  spiritTags,
  statIcons,
}: Props) {
  const maxStat = RADAR_STAT_MAX;

  const polygonPoints = useMemo(() => {
    return POLYGON_ORDER.map((key) => {
      const ratio = spirit[key] / maxStat;
      const p = polarPoint(STAT_ANGLE[key], RADIUS * ratio);
      return toPointStr(p.x, p.y);
    }).join(" ");
  }, [spirit, maxStat]);

  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <div className="spirit-radar">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="spirit-radar__svg"
        role="img"
        aria-label={`${spirit.名称}种族值雷达图`}
      >
        {gridLevels.map((level) => (
          <polygon
            key={level}
            points={POLYGON_ORDER.map((key) => {
              const p = polarPoint(STAT_ANGLE[key], RADIUS * level);
              return toPointStr(p.x, p.y);
            }).join(" ")}
            className="spirit-radar__grid"
          />
        ))}
        {POLYGON_ORDER.map((key) => {
          const outer = polarPoint(STAT_ANGLE[key], RADIUS);
          return (
            <line
              key={key}
              x1={CENTER}
              y1={CENTER}
              x2={outer.x}
              y2={outer.y}
              className="spirit-radar__axis"
            />
          );
        })}
        <polygon points={polygonPoints} className="spirit-radar__fill" />
        <polygon points={polygonPoints} className="spirit-radar__stroke" />
        {POLYGON_ORDER.map((key) => {
          const ratio = spirit[key] / maxStat;
          const p = polarPoint(STAT_ANGLE[key], RADIUS * ratio);
          const tag = TAG_BY_STAT[key];
          const tagged = tag ? spiritTags.includes(tag) : false;
          return (
            <circle
              key={key}
              cx={p.x}
              cy={p.y}
              r={3}
              className={`spirit-radar__dot${tagged ? " spirit-radar__dot--tagged" : ""}`}
            />
          );
        })}
      </svg>
      <div className="spirit-radar__icons">
        {POLYGON_ORDER.map((key) => {
          const tag = TAG_BY_STAT[key];
          const highlighted = tag ? spiritTags.includes(tag) : false;
          const p = polarPoint(STAT_ANGLE[key], ICON_RADIUS);
          const iconUrl = statIcons[key];
          return (
            <div
              key={key}
              className={`spirit-radar__icon-wrap${highlighted ? " spirit-radar__icon-wrap--on" : ""}`}
              style={{
                left: `${(p.x / SIZE) * 100}%`,
                top: `${(p.y / SIZE) * 100}%`,
              }}
              title={highlighted ? `${key}（已达标）` : key}
            >
              {iconUrl ? (
                <img src={iconUrl} alt={key} className="spirit-radar__icon" />
              ) : (
                <span className="spirit-radar__icon-fallback" />
              )}
              <span className="spirit-radar__icon-label">{STAT_SHORT[key]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
