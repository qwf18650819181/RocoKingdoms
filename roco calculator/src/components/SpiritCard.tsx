import { ATTRIBUTE_COLORS } from "../data/attributes";
import { DRAG_SPIRIT } from "../types/pvp";
import type { Spirit } from "../types/spirit";

interface Props {
  spirit: Spirit;
  showImages?: boolean;
  active: boolean;
  pvpDraggable?: boolean;
  pvpTeamTaken?: boolean;
  onSelect: (id: number) => void;
}

export function SpiritCard({
  spirit,
  showImages = true,
  active,
  pvpDraggable,
  pvpTeamTaken,
  onSelect,
}: Props) {
  const primaryColor = ATTRIBUTE_COLORS[spirit.主属性] ?? "#888";

  return (
    <button
      type="button"
      className={`spirit-card${active ? " spirit-card--active" : ""}${pvpTeamTaken ? " spirit-card--team-taken" : ""}`}
      aria-current={active ? "true" : undefined}
      draggable={pvpDraggable}
      onDragStart={(e) => {
        if (!pvpDraggable) return;
        e.dataTransfer.setData(DRAG_SPIRIT, String(spirit.id));
        e.dataTransfer.effectAllowed = "copy";
      }}
      onClick={() => onSelect(spirit.id)}
      title={
        pvpTeamTaken
          ? `${spirit.名称} · 已在队伍中 · 点击查看详情`
          : `${spirit.页面标题} · #${spirit.编号} · ${spirit.种族值总和}`
      }
    >
      <div
        className={`spirit-card__image-wrap${!showImages ? " spirit-card__image-wrap--hidden" : ""}`}
      >
        {showImages ? (
          <img
            src={spirit.立绘链接}
            alt={spirit.名称}
            loading="lazy"
            onError={(e) => {
              const img = e.currentTarget;
              img.style.display = "none";
              img.parentElement?.classList.add(
                "spirit-card__image-wrap--missing",
              );
            }}
          />
        ) : (
          <span className="spirit-card__no-img" aria-hidden>
            {spirit.编号}
          </span>
        )}
        <span className="spirit-card__no">{spirit.编号}</span>
      </div>
      <div className="spirit-card__body">
        <span className="spirit-card__name">{spirit.名称}</span>
        <span className="spirit-card__meta">
          <span
            className="attr-badge"
            style={{ backgroundColor: primaryColor }}
          >
            {spirit.主属性}
          </span>
          {spirit.副属性 ? (
            <span
              className="attr-badge attr-badge--secondary"
              style={{
                backgroundColor: ATTRIBUTE_COLORS[spirit.副属性] ?? "#666",
              }}
            >
              {spirit.副属性}
            </span>
          ) : null}
          <span className="spirit-card__bst">{spirit.种族值总和}</span>
        </span>
      </div>
    </button>
  );
}
