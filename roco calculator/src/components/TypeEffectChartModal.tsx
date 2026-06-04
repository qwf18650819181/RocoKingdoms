import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ALL_ATTRIBUTES } from "../data/attributes";
import { useDraggablePanel } from "../hooks/useDraggablePanel";
import type { AttributeIconMap } from "../types/spirit";
import type { TypeEffectivenessData } from "../types/typeEffectiveness";
import { TypeEffectChartView } from "./TypeEffectChartView";

interface Props {
  open: boolean;
  onClose: () => void;
  typeEffectiveness: TypeEffectivenessData | null;
  attributeIcons: AttributeIconMap;
  queryAttrs: string[];
  onQueryAttrsChange?: (attrs: string[]) => void;
}

export function normalizeTypeChartAttrs(attrs: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const a of attrs) {
    if (!ALL_ATTRIBUTES.includes(a) || seen.has(a)) continue;
    seen.add(a);
    out.push(a);
  }
  return out;
}

export function TypeEffectChartModal({
  open,
  onClose,
  typeEffectiveness,
  attributeIcons,
  queryAttrs,
  onQueryAttrsChange,
}: Props) {
  const { pos, panelRef, onDragStart } = useDraggablePanel({ x: 12, y: 56 });
  const centerAttrs = normalizeTypeChartAttrs(queryAttrs);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !typeEffectiveness) return null;

  const pickCenters = (attrs: string[]) => {
    onQueryAttrsChange?.(normalizeTypeChartAttrs(attrs));
  };

  return createPortal(
    <div className="type-chart-portal" role="presentation">
      <div
        ref={panelRef}
        className="type-chart-modal__panel"
        role="complementary"
        aria-label="属性克制关系"
        style={{ left: pos.x, top: pos.y }}
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className="type-chart-modal__header type-chart-modal__header--drag"
          onPointerDown={onDragStart}
        >
          <span className="type-chart-modal__drag-hint" aria-hidden>
            ⠿
          </span>
          <h2>属性克制关系</h2>
          <button
            type="button"
            className="type-chart-modal__close"
            onClick={onClose}
            aria-label="关闭"
          >
            ×
          </button>
        </header>
        <TypeEffectChartView
          typeEffectiveness={typeEffectiveness}
          attributeIcons={attributeIcons}
          centerAttrs={centerAttrs}
          onCenterAttrsChange={pickCenters}
        />
      </div>
    </div>,
    document.body,
  );
}
