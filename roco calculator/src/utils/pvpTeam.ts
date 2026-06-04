import { SKILL_SOURCES, type SpiritSkillEntry, type SpiritSkills } from "../types/spirit";
import type { PvpSkillSlots, PvpTeamSlot } from "../types/pvp";
import { PVP_SKILLS_PER_SPIRIT } from "../types/pvp";

export function flattenSpiritSkills(buckets: SpiritSkills | undefined): SpiritSkillEntry[] {
  if (!buckets) return [];
  const seen = new Set<string>();
  const list: SpiritSkillEntry[] = [];
  for (const source of SKILL_SOURCES) {
    for (const skill of buckets[source] ?? []) {
      if (!seen.has(skill.name)) {
        seen.add(skill.name);
        list.push(skill);
      }
    }
  }
  return list;
}

export function findNextEmptySkillIndex(skills: PvpSkillSlots): number | null {
  const index = skills.findIndex((s) => !s);
  return index === -1 ? null : index;
}

export function cloneSkillSlots(skills: PvpSkillSlots): PvpSkillSlots {
  return [...skills] as PvpSkillSlots;
}

export function clearSlot(): PvpTeamSlot {
  return { spiritId: null, skills: [null, null, null, null] };
}

export function isSpiritInTeam(
  team: PvpTeamSlot[],
  spiritId: number,
  exceptSlot?: number,
): boolean {
  return team.some(
    (slot, index) => index !== exceptSlot && slot.spiritId === spiritId,
  );
}

export function findSpiritTeamSlot(
  team: PvpTeamSlot[],
  spiritId: number,
): number | null {
  const index = team.findIndex((slot) => slot.spiritId === spiritId);
  return index >= 0 ? index : null;
}

/** 同一只精灵的 4 个技能槽内是否已选用该技能 */
export function isSkillUsedInSlot(
  skills: PvpSkillSlots,
  skillName: string,
  exceptIndex?: number,
): boolean {
  return skills.some(
    (name, index) => index !== exceptIndex && name === skillName,
  );
}

export function assignSkillAt(
  skills: PvpSkillSlots,
  skillIndex: number,
  skillName: string | null,
): PvpSkillSlots {
  const next = cloneSkillSlots(skills);
  if (skillIndex >= 0 && skillIndex < PVP_SKILLS_PER_SPIRIT) {
    next[skillIndex] = skillName;
  }
  return next;
}

export function skillBelongsToSpirit(
  skillName: string,
  buckets: SpiritSkills | undefined,
): boolean {
  return flattenSpiritSkills(buckets).some((s) => s.name === skillName);
}

export function reorderPvpTeam(
  team: PvpTeamSlot[],
  fromIndex: number,
  toIndex: number,
): PvpTeamSlot[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= team.length ||
    toIndex >= team.length
  ) {
    return team;
  }
  const next = [...team];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export function remapActiveSlotAfterReorder(
  active: number,
  fromIndex: number,
  toIndex: number,
): number {
  if (active === fromIndex) return toIndex;
  if (fromIndex < active && toIndex >= active) return active - 1;
  if (fromIndex > active && toIndex <= active) return active + 1;
  return active;
}
