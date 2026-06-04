export const PVP_TEAM_SIZE = 6;
export const PVP_SKILLS_PER_SPIRIT = 4;

export type PvpSkillSlots = [
  string | null,
  string | null,
  string | null,
  string | null,
];

export interface PvpTeamSlot {
  spiritId: number | null;
  skills: PvpSkillSlots;
}

export function createEmptyPvpSlot(): PvpTeamSlot {
  return {
    spiritId: null,
    skills: [null, null, null, null],
  };
}

export function createEmptyPvpTeam(): PvpTeamSlot[] {
  return Array.from({ length: PVP_TEAM_SIZE }, createEmptyPvpSlot);
}

export const DRAG_SPIRIT = "application/x-roco-spirit-id";
export const DRAG_SKILL = "application/x-roco-skill";
export const DRAG_TEAM_SLOT = "application/x-roco-pvp-slot-index";

export interface PvpSkillDragPayload {
  spiritId: number;
  name: string;
}
