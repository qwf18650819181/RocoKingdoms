import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { createEmptyPvpTeam, type PvpTeamSlot } from "../types/pvp";
import { PVP_SKILLS_PER_SPIRIT } from "../types/pvp";

const STORAGE_KEY = "roco-pvp-team";
const FILE_VERSION = 1;

export interface PvpTeamFile {
  version: number;
  slots: PvpTeamSlot[];
}

export type ExportPvpTeamResult = "saved" | "cancelled" | "browser";

function isSkillSlots(raw: unknown): raw is (string | null)[] {
  return (
    Array.isArray(raw) &&
    raw.length === PVP_SKILLS_PER_SPIRIT &&
    raw.every((s) => s === null || typeof s === "string")
  );
}

function isTeamSlot(raw: unknown): raw is PvpTeamSlot {
  if (!raw || typeof raw !== "object") return false;
  const slot = raw as PvpTeamSlot;
  return (
    (slot.spiritId === null || typeof slot.spiritId === "number") &&
    isSkillSlots(slot.skills)
  );
}

export function parsePvpTeamFile(raw: string): PvpTeamSlot[] | null {
  try {
    const data = JSON.parse(raw) as PvpTeamFile | PvpTeamSlot[];
    const slots = Array.isArray(data)
      ? data
      : Array.isArray(data?.slots)
        ? data.slots
        : null;
    if (!slots || slots.length !== 6 || !slots.every(isTeamSlot)) {
      return null;
    }
    return slots.map((s) => ({
      spiritId: s.spiritId,
      skills: [...s.skills] as PvpTeamSlot["skills"],
    }));
  } catch {
    return null;
  }
}

export function sanitizeImportedTeam(
  slots: PvpTeamSlot[],
  validSpiritIds: Set<number>,
): PvpTeamSlot[] {
  const usedSpirits = new Set<number>();
  return slots.map((slot) => {
    if (
      slot.spiritId === null ||
      !validSpiritIds.has(slot.spiritId) ||
      usedSpirits.has(slot.spiritId)
    ) {
      return { spiritId: null, skills: [null, null, null, null] };
    }
    usedSpirits.add(slot.spiritId);
    const seenSkills = new Set<string>();
    const skills = slot.skills.map((name) => {
      if (!name || seenSkills.has(name)) return null;
      seenSkills.add(name);
      return name;
    }) as PvpTeamSlot["skills"];
    return { spiritId: slot.spiritId, skills };
  });
}

export function serializePvpTeam(team: PvpTeamSlot[]): string {
  const payload: PvpTeamFile = { version: FILE_VERSION, slots: team };
  return JSON.stringify(payload, null, 2);
}

export function savePvpTeamToStorage(team: PvpTeamSlot[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, serializePvpTeam(team));
  } catch {
    /* 存储满或不可用 */
  }
}

export function loadPvpTeamFromStorage(): PvpTeamSlot[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parsePvpTeamFile(raw);
  } catch {
    return null;
  }
}

function downloadPvpTeamFileBrowser(team: PvpTeamSlot[]): void {
  const blob = new Blob([serializePvpTeam(team)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `pvp-team-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/** 保存到文件：Tauri 弹窗选路径，浏览器环境则触发下载 */
export async function exportPvpTeamFile(
  team: PvpTeamSlot[],
): Promise<ExportPvpTeamResult> {
  const json = serializePvpTeam(team);
  const defaultName = `pvp-team-${new Date().toISOString().slice(0, 10)}.json`;

  if ("__TAURI_INTERNALS__" in window) {
    try {
      const path = await save({
        defaultPath: defaultName,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!path) return "cancelled";
      await writeTextFile(path, json);
      return "saved";
    } catch {
      downloadPvpTeamFileBrowser(team);
      return "browser";
    }
  }

  downloadPvpTeamFileBrowser(team);
  return "browser";
}

export function createEmptyTeamFile(): PvpTeamSlot[] {
  return createEmptyPvpTeam();
}
