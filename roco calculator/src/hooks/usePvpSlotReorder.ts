import { useCallback, useEffect, useRef, useState } from "react";
import { remapActiveSlotAfterReorder, reorderPvpTeam } from "../utils/pvpTeam";
import type { PvpTeamSlot } from "../types/pvp";
import type { Dispatch, SetStateAction } from "react";

export function usePvpSlotReorder(
  _team: PvpTeamSlot[],
  setTeam: Dispatch<SetStateAction<PvpTeamSlot[]>>,
  activeSlot: number,
  onActiveSlotChange: (index: number) => void,
) {
  const dragFromRef = useRef<number | null>(null);
  const dragOverRef = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const moveSlot = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      setTeam((prev) => reorderPvpTeam(prev, fromIndex, toIndex));
      onActiveSlotChange(
        remapActiveSlotAfterReorder(activeSlot, fromIndex, toIndex),
      );
    },
    [activeSlot, setTeam, onActiveSlotChange],
  );

  const finishDrag = useCallback(() => {
    const from = dragFromRef.current;
    const to = dragOverRef.current;
    dragFromRef.current = null;
    dragOverRef.current = null;
    setDragging(false);
    setDragFrom(null);
    setDragOver(null);
    if (from !== null && to !== null && from !== to) {
      moveSlot(from, to);
    }
  }, [moveSlot]);

  const updateTarget = useCallback((clientX: number, clientY: number) => {
    if (dragFromRef.current === null) return;
    const el = document.elementFromPoint(clientX, clientY);
    const slotEl = el?.closest<HTMLElement>("[data-pvp-slot-index]");
    if (!slotEl) return;
    const idx = Number(slotEl.dataset.pvpSlotIndex);
    if (!Number.isFinite(idx)) return;
    dragOverRef.current = idx;
    setDragOver(idx);
  }, []);

  const beginDrag = useCallback((slotIndex: number) => {
    dragFromRef.current = slotIndex;
    dragOverRef.current = slotIndex;
    setDragging(true);
    setDragFrom(slotIndex);
    setDragOver(slotIndex);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      e.preventDefault();
      updateTarget(e.clientX, e.clientY);
    };
    const onUp = () => finishDrag();
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [dragging, finishDrag, updateTarget]);

  return { dragging, dragFrom, dragOver, beginDrag, finishDrag };
}
