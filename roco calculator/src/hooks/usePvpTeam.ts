import { useCallback, useEffect, useRef, useState } from "react";
import {
  assignSkillAt,
  clearSlot,
  findNextEmptySkillIndex,
  isSkillUsedInSlot,
  isSpiritInTeam,
  skillBelongsToSpirit,
} from "../utils/pvpTeam";
import {
  createEmptyPvpTeam,
  type PvpTeamSlot,
} from "../types/pvp";
import type { SpiritSkills } from "../types/spirit";
import {
  exportPvpTeamFile,
  loadPvpTeamFromStorage,
  parsePvpTeamFile,
  sanitizeImportedTeam,
  savePvpTeamToStorage,
  type ExportPvpTeamResult,
} from "../utils/pvpTeamStorage";

export function usePvpTeam(
  skillMap: Record<string, SpiritSkills>,
  validSpiritIds: Set<number>,
) {
  const [team, setTeam] = useState<PvpTeamSlot[]>(createEmptyPvpTeam);
  const [activeSlot, setActiveSlot] = useState(0);
  const [activeSkillIndex, setActiveSkillIndex] = useState<number | null>(null);
  const hydratedRef = useRef(false);

  const applyTeam = useCallback(
    (slots: PvpTeamSlot[]) => {
      const next = sanitizeImportedTeam(slots, validSpiritIds);
      setTeam(next);
      setActiveSlot(0);
      setActiveSkillIndex(null);
      savePvpTeamToStorage(next);
    },
    [validSpiritIds],
  );

  useEffect(() => {
    if (hydratedRef.current || validSpiritIds.size === 0) return;
    const stored = loadPvpTeamFromStorage();
    if (stored) {
      setTeam(sanitizeImportedTeam(stored, validSpiritIds));
    }
    hydratedRef.current = true;
  }, [validSpiritIds]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    savePvpTeamToStorage(team);
  }, [team]);

  const assignSpiritToSlot = useCallback(
    (slotIndex: number, spiritId: number) => {
      setTeam((prev) => {
        if (isSpiritInTeam(prev, spiritId, slotIndex)) return prev;
        return prev.map((slot, i) =>
          i === slotIndex
            ? { spiritId, skills: [null, null, null, null] }
            : slot,
        );
      });
      setActiveSlot(slotIndex);
      setActiveSkillIndex(0);
    },
    [],
  );

  const assignSkillToSlot = useCallback(
    (
      slotIndex: number,
      skillIndex: number,
      skillName: string,
      spiritId: number,
    ) => {
      const buckets = skillMap[String(spiritId)];
      if (!skillBelongsToSpirit(skillName, buckets)) return;
      setTeam((prev) =>
        prev.map((slot, i) => {
          if (i !== slotIndex || slot.spiritId !== spiritId) return slot;
          if (isSkillUsedInSlot(slot.skills, skillName, skillIndex)) {
            return slot;
          }
          return {
            ...slot,
            skills: assignSkillAt(slot.skills, skillIndex, skillName),
          };
        }),
      );
    },
    [skillMap],
  );

  const pickSkillForActiveSlot = useCallback(
    (skillName: string, spiritId: number) => {
      const slot = team[activeSlot];
      if (!slot?.spiritId || slot.spiritId !== spiritId) return;
      const target =
        activeSkillIndex ?? findNextEmptySkillIndex(slot.skills) ?? 0;
      if (isSkillUsedInSlot(slot.skills, skillName, target)) return;
      const nextSkills = assignSkillAt(slot.skills, target, skillName);
      assignSkillToSlot(activeSlot, target, skillName, spiritId);
      setActiveSkillIndex(findNextEmptySkillIndex(nextSkills));
    },
    [team, activeSlot, activeSkillIndex, assignSkillToSlot],
  );

  const clearTeamSlot = useCallback((slotIndex: number) => {
    setTeam((prev) =>
      prev.map((slot, i) => (i === slotIndex ? clearSlot() : slot)),
    );
    setActiveSkillIndex((idx) => (activeSlot === slotIndex ? null : idx));
  }, [activeSlot]);

  const activeSlotSpiritId = team[activeSlot]?.spiritId ?? null;

  const canPickSkillsFor = (spiritId: number | null) =>
    spiritId !== null && activeSlotSpiritId === spiritId;

  const resetTeam = useCallback(() => {
    const empty = createEmptyPvpTeam();
    setTeam(empty);
    setActiveSlot(0);
    setActiveSkillIndex(null);
    savePvpTeamToStorage(empty);
  }, []);

  const saveTeam = useCallback(async (): Promise<ExportPvpTeamResult> => {
    savePvpTeamToStorage(team);
    return exportPvpTeamFile(team);
  }, [team]);

  const importTeamFromText = useCallback(
    (raw: string): boolean => {
      const parsed = parsePvpTeamFile(raw);
      if (!parsed) return false;
      applyTeam(parsed);
      return true;
    },
    [applyTeam],
  );

  return {
    team,
    setTeam,
    activeSlot,
    setActiveSlot,
    activeSkillIndex,
    setActiveSkillIndex,
    assignSpiritToSlot,
    assignSkillToSlot,
    pickSkillForActiveSlot,
    clearTeamSlot,
    resetTeam,
    saveTeam,
    importTeamFromText,
    activeSlotSpiritId,
    canPickSkillsFor,
  };
}
