import { useMemo } from "react";
import type { CSSProperties } from "react";
import {
  ALL_ATTRIBUTES,
  ATTRIBUTE_COLORS,
  attrLabelTextColor,
  attrShortLabel,
} from "../data/attributes";
import type { AttributeIconMap } from "../types/spirit";
import type { TypeEffectivenessData } from "../types/typeEffectiveness";
import {
  mergeTypeChartRelations,
  type TypeChartArrowLink,
} from "../utils/typeChartMerge";
import { AttributeIcon } from "./AttributeIcon";

const ROW_H = 22;
const ROW_COUNT = ALL_ATTRIBUTES.length;

interface Props {
  typeEffectiveness: TypeEffectivenessData;
  attributeIcons: AttributeIconMap;
  centerAttrs: string[];
  onCenterAttrsChange: (attrs: string[]) => void;
}

function rowY(attr: string): number {
  return ALL_ATTRIBUTES.indexOf(attr) * ROW_H + ROW_H / 2;
}

/** 折线：先横后竖再横，避免箭头挤在同一点 */
function elbowPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  bendX: number,
): string {
  return `M ${x1} ${y1} L ${bendX} ${y1} L ${bendX} ${y2} L ${x2} ${y2}`;
}

function fanOffset(index: number, total: number, spread: number): number {
  if (total <= 1) return 0;
  return (index - (total - 1) / 2) * spread;
}

/** 与三列 grid（1fr 26px 52px 26px 1fr）对齐，线止于属性 pill 外框 */
const LINE_LEFT_START = 32;
const LINE_LEFT_END = 42.5;
const LINE_LEFT_BEND = 37;
const LINE_RIGHT_START = 57.5;
const LINE_RIGHT_END = 68.5;
const LINE_RIGHT_BEND = 63;

function MatrixArrows({ links }: { links: TypeChartArrowLink[] }) {
  const h = ROW_COUNT * ROW_H;

  const leftGroups = useMemo(() => {
    const m = new Map<string, TypeChartArrowLink[]>();
    for (const link of links.filter((l) => l.side === "left")) {
      const key = link.to;
      const arr = m.get(key) ?? [];
      arr.push(link);
      m.set(key, arr);
    }
    return m;
  }, [links]);

  const rightGroups = useMemo(() => {
    const m = new Map<string, TypeChartArrowLink[]>();
    for (const link of links.filter((l) => l.side === "right")) {
      const key = link.from;
      const arr = m.get(key) ?? [];
      arr.push(link);
      m.set(key, arr);
    }
    return m;
  }, [links]);

  return (
    <svg
      className="type-matrix-board__arrows"
      viewBox={`0 0 100 ${h}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      {links.map((link) => {
        if (link.side === "left") {
          const group = leftGroups.get(link.to) ?? [];
          const i = group.indexOf(link);
          const y1 = rowY(link.from);
          const y2 = rowY(link.to) + fanOffset(i, group.length, 1.8);
          const d = elbowPath(
            LINE_LEFT_START,
            y1,
            LINE_LEFT_END,
            y2,
            LINE_LEFT_BEND,
          );
          return (
            <path
              key={`l-${link.from}-${link.to}-${link.color}`}
              d={d}
              fill="none"
              stroke={link.color}
              strokeWidth="1.5"
              strokeLinecap="butt"
              strokeLinejoin="round"
              opacity="0.9"
            />
          );
        }
        const group = rightGroups.get(link.from) ?? [];
        const i = group.indexOf(link);
        const y1 = rowY(link.from) + fanOffset(i, group.length, 1.8);
        const y2 = rowY(link.to);
        const d = elbowPath(
          LINE_RIGHT_START,
          y1,
          LINE_RIGHT_END,
          y2,
          LINE_RIGHT_BEND,
        );
        return (
          <path
            key={`r-${link.from}-${link.to}-${link.color}`}
            d={d}
            fill="none"
            stroke={link.color}
            strokeWidth="1.5"
            strokeLinecap="butt"
            strokeLinejoin="round"
            opacity="0.9"
          />
        );
      })}
    </svg>
  );
}

function SidePill({
  attr,
  attributeIcons,
  active,
  dualWeak,
}: {
  attr: string;
  attributeIcons: AttributeIconMap;
  active: boolean;
  /** 每个选中属性单独都被该攻击克制（显示 ×2） */
  dualWeak?: boolean;
}) {
  const bg = ATTRIBUTE_COLORS[attr] ?? "#888";
  const multLabel = dualWeak ? "×2" : "";
  const title = dualWeak
    ? `${attr} · 各选中属性均被克制（×2）`
    : attr;

  if (!active) {
    return (
      <span className="type-matrix-board__pill type-matrix-board__pill--ghost" title={attr}>
        <AttributeIcon attr={attr} iconUrl={attributeIcons[attr]} size={13} />
        <span>{attrShortLabel(attr)}</span>
      </span>
    );
  }
  return (
    <span
      className={`type-matrix-board__pill type-matrix-board__pill--on${multLabel ? " type-matrix-board__pill--mult" : ""}`}
      style={{ backgroundColor: bg, color: attrLabelTextColor(bg) }}
      title={title}
    >
      <AttributeIcon attr={attr} iconUrl={attributeIcons[attr]} size={13} />
      <span>{attrShortLabel(attr)}</span>
      {multLabel ? (
        <span className="type-matrix-board__mult type-matrix-board__mult--high">
          {multLabel}
        </span>
      ) : null}
    </span>
  );
}

export function TypeEffectChartView({
  typeEffectiveness,
  attributeIcons,
  centerAttrs,
  onCenterAttrsChange,
}: Props) {
  const merged = useMemo(
    () => mergeTypeChartRelations(typeEffectiveness, centerAttrs),
    [typeEffectiveness, centerAttrs],
  );

  const { counters, counterDualWeak, countered, linksLeft, linksRight } =
    merged;
  const allLinks = useMemo(
    () => [...linksLeft, ...linksRight],
    [linksLeft, linksRight],
  );

  const selectedSet = useMemo(() => new Set(centerAttrs), [centerAttrs]);

  const toggleCenter = (attr: string) => {
    if (selectedSet.has(attr)) {
      onCenterAttrsChange(centerAttrs.filter((a) => a !== attr));
      return;
    }
    onCenterAttrsChange([...centerAttrs, attr]);
  };

  const primaryAccent =
    centerAttrs.length === 1
      ? ATTRIBUTE_COLORS[centerAttrs[0]] ?? "#888"
      : "var(--accent)";

  const style = {
    "--matrix-row-h": `${ROW_H}px`,
    "--matrix-accent": primaryAccent,
    "--matrix-h": `${ROW_COUNT * ROW_H}px`,
  } as CSSProperties;

  return (
    <div className="type-matrix-board-wrap" style={style}>
      <div className="type-matrix-board__toolbar">
        {centerAttrs.length > 1 ? (
          <button
            type="button"
            className="type-matrix-board__clear"
            onClick={() => onCenterAttrsChange([centerAttrs[0]])}
          >
            仅留首个
          </button>
        ) : null}
        {centerAttrs.length > 0 ? (
          <button
            type="button"
            className="type-matrix-board__clear"
            onClick={() => onCenterAttrsChange([])}
          >
            清空
          </button>
        ) : null}
      </div>
      <div className="type-matrix-board">
        {allLinks.length > 0 ? <MatrixArrows links={allLinks} /> : null}
        <div className="type-matrix-board__cols">
          <div className="type-matrix-board__col type-matrix-board__col--left">
            {ALL_ATTRIBUTES.map((attr) => (
              <div key={attr} className="type-matrix-board__row">
                <SidePill
                  attr={attr}
                  attributeIcons={attributeIcons}
                  active={counters.has(attr)}
                  dualWeak={counterDualWeak.has(attr)}
                />
              </div>
            ))}
          </div>
          <div className="type-matrix-board__col type-matrix-board__col--gap" aria-hidden />
          <div className="type-matrix-board__col type-matrix-board__col--center">
            {ALL_ATTRIBUTES.map((attr) => {
              const bg = ATTRIBUTE_COLORS[attr] ?? "#888";
              const isSelected = selectedSet.has(attr);
              return (
                <div
                  key={attr}
                  className={`type-matrix-board__row${isSelected ? " type-matrix-board__row--query" : ""}`}
                >
                  <button
                    type="button"
                    className={`type-matrix-board__pill type-matrix-board__pill--center${isSelected ? " type-matrix-board__pill--on" : " type-matrix-board__pill--ghost"}`}
                    style={
                      isSelected
                        ? {
                            backgroundColor: bg,
                            color: attrLabelTextColor(bg),
                          }
                        : undefined
                    }
                    title={`${isSelected ? "取消" : "添加"} ${attr}`}
                    onClick={() => toggleCenter(attr)}
                  >
                    <AttributeIcon
                      attr={attr}
                      iconUrl={attributeIcons[attr]}
                      size={13}
                    />
                    <span>{attrShortLabel(attr)}</span>
                  </button>
                </div>
              );
            })}
          </div>
          <div className="type-matrix-board__col type-matrix-board__col--gap" aria-hidden />
          <div className="type-matrix-board__col type-matrix-board__col--right">
            {ALL_ATTRIBUTES.map((attr) => (
              <div key={attr} className="type-matrix-board__row">
                <SidePill
                  attr={attr}
                  attributeIcons={attributeIcons}
                  active={countered.has(attr)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
