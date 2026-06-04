import { useCallback, useRef, useState } from "react";

interface Position {
  x: number;
  y: number;
}

export function useDraggablePanel(defaultPos: Position = { x: 40, y: 72 }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Position>(defaultPos);
  const drag = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  const clampPos = useCallback((x: number, y: number) => {
    const pad = 8;
    const w = panelRef.current?.offsetWidth ?? 420;
    const h = panelRef.current?.offsetHeight ?? 320;
    const maxX = Math.max(pad, window.innerWidth - w - pad);
    const maxY = Math.max(pad, window.innerHeight - h - pad);
    return {
      x: Math.min(maxX, Math.max(pad, x)),
      y: Math.min(maxY, Math.max(pad, y)),
    };
  }, []);

  const onDragStart = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if ((e.target as HTMLElement).closest("button, input, a")) return;
      drag.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originX: pos.x,
        originY: pos.y,
      };

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== drag.current.pointerId) return;
        const dx = ev.clientX - drag.current.startX;
        const dy = ev.clientY - drag.current.startY;
        setPos(clampPos(drag.current.originX + dx, drag.current.originY + dy));
      };

      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== drag.current.pointerId) return;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [pos.x, pos.y, clampPos],
  );

  return { pos, panelRef, onDragStart };
}
