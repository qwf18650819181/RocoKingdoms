import {
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { CoverageList } from "./CoverageDisplay";
import { TypeChar } from "./TypeChar";
import type { ExportPvpTeamResult } from "../utils/pvpTeamStorage";
import {
  formatSkillEnergy,
  formatSkillPower,
  getSkillDisplayText,
} from "../utils/skillScore";
import {
  flattenCoverageTargets,
  getAttackCoverageFromSkills,
  getMissingCoverage,
} from "../utils/attackCoverage";
import { usePvpSlotReorder } from "../hooks/usePvpSlotReorder";
import {
  assignSkillAt,
  flattenSpiritSkills,
  remapActiveSlotAfterReorder,
  reorderPvpTeam,
} from "../utils/pvpTeam";
import { isCoverageAttackSkill } from "../utils/attackCoverage";
import {
  DRAG_SKILL,
  DRAG_SPIRIT,
  DRAG_TEAM_SLOT,
  PVP_SKILLS_PER_SPIRIT,
  type PvpSkillDragPayload,
  type PvpTeamSlot,
} from "../types/pvp";
import type { Spirit } from "../types/spirit";
import type { SpiritSkills } from "../types/spirit";
import type { SkillCatalogMap } from "../types/skillScore";
import type { TypeEffectivenessData } from "../types/typeEffectiveness";

interface Props {
  team: PvpTeamSlot[];
  setTeam: Dispatch<SetStateAction<PvpTeamSlot[]>>;
  spirits: Spirit[];
  showImages?: boolean;
  skillMap: Record<string, SpiritSkills>;
  skillCatalog: SkillCatalogMap;
  typeEffectiveness: TypeEffectivenessData;
  activeSlot: number;
  activeSkillIndex: number | null;
  onActiveSlotChange: (index: number) => void;
  onActiveSkillIndexChange: (index: number | null) => void;
  onAssignSpirit: (slotIndex: number, spiritId: number) => void;
  onAssignSkill: (
    slotIndex: number,
    skillIndex: number,
    skillName: string,
    spiritId: number,
  ) => void;
  onClearSlot: (slotIndex: number) => void;
  onClearTeam: () => void;
  onSaveTeam: () => Promise<import("../utils/pvpTeamStorage").ExportPvpTeamResult>;
  onImportTeam: (raw: string) => boolean;
}

function parseSpiritDrag(data: DataTransfer): number | null {
  const raw = data.getData(DRAG_SPIRIT);
  if (!raw) return null;
  const id = Number(raw);
  return Number.isFinite(id) ? id : null;
}

const SLOT_DRAG_PLAIN = "roco-pvp-slot:";

function parseSlotDrag(data: DataTransfer): number | null {
  const custom = data.getData(DRAG_TEAM_SLOT);
  if (custom) {
    const index = Number(custom);
    if (Number.isFinite(index)) return index;
  }
  const plain = data.getData("text/plain");
  if (plain.startsWith(SLOT_DRAG_PLAIN)) {
    const index = Number(plain.slice(SLOT_DRAG_PLAIN.length));
    if (Number.isFinite(index)) return index;
  }
  return null;
}

function isSlotDragEvent(data: DataTransfer): boolean {
  return (
    data.types.includes(DRAG_TEAM_SLOT) ||
    data.types.includes("text/plain")
  );
}

function parseSkillDrag(data: DataTransfer): PvpSkillDragPayload | null {
  const raw = data.getData(DRAG_SKILL);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PvpSkillDragPayload;
    if (
      typeof parsed.spiritId === "number" &&
      typeof parsed.name === "string"
    ) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

export function PvpTeamPanel({
  team,
  setTeam,
  spirits,
  showImages = true,
  skillMap,
  skillCatalog,
  typeEffectiveness,
  activeSlot,
  activeSkillIndex,
  onActiveSlotChange,
  onActiveSkillIndexChange,
  onAssignSpirit,
  onAssignSkill,
  onClearSlot,
  onClearTeam,
  onSaveTeam,
  onImportTeam,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const { dragging, dragFrom, dragOver, beginDrag } = usePvpSlotReorder(
    team,
    setTeam,
    activeSlot,
    onActiveSlotChange,
  );

  const flashMsg = (msg: string) => {
    setActionMsg(msg);
    window.setTimeout(() => setActionMsg(null), 2500);
  };

  const handleSave = async () => {
    const result: ExportPvpTeamResult = await onSaveTeam();
    if (result === "saved") flashMsg("已保存到文件");
    else if (result === "browser") flashMsg("已保存到本地并下载 JSON");
    else flashMsg("已保存到本地");
  };

  const spiritById = useMemo(() => {
    const map = new Map<number, Spirit>();
    for (const s of spirits) map.set(s.id, s);
    return map;
  }, [spirits]);

  const teamCoverage = useMemo(() => {
    const lines = team.flatMap((slot) =>
      getAttackCoverageFromSkills(slot.skills, skillCatalog, typeEffectiveness),
    );
    const merged = new Map<string, Set<string>>();
    for (const line of lines) {
      let set = merged.get(line.attack);
      if (!set) {
        set = new Set<string>();
        merged.set(line.attack, set);
      }
      for (const t of line.targets) set.add(t);
    }
    const mergedLines = [...merged.entries()].map(([attack, targets]) => ({
      attack,
      targets: [...targets],
    }));
    const covered = flattenCoverageTargets(
      mergedLines,
      typeEffectiveness.attributes,
    );
    const missing = getMissingCoverage(covered, typeEffectiveness);
    return { mergedLines, covered, missing };
  }, [team, skillCatalog, typeEffectiveness]);

  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      if (onImportTeam(text)) {
        flashMsg("导入成功");
      } else {
        flashMsg("文件格式无效");
      }
    };
    reader.readAsText(file, "utf-8");
  };

  return (
    <aside className="pvp-panel" aria-label="PVP 配队">
      <div className="pvp-panel__actions">
        <button type="button" className="pvp-panel__action" onClick={handleSave}>
          保存队伍
        </button>
        <button
          type="button"
          className="pvp-panel__action"
          onClick={() => fileInputRef.current?.click()}
        >
          导入队伍
        </button>
        <button
          type="button"
          className="pvp-panel__action pvp-panel__action--danger"
          onClick={() => {
            if (
              team.some((s) => s.spiritId) &&
              !window.confirm("确定清空整支队伍？")
            ) {
              return;
            }
            onClearTeam();
            flashMsg("已清空队伍");
          }}
        >
          清空队伍
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="pvp-panel__file-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImportFile(file);
            e.target.value = "";
          }}
        />
        {actionMsg ? (
          <span className="pvp-panel__import-msg">{actionMsg}</span>
        ) : null}
      </div>
      <ul className={`pvp-team-slots${dragging ? " pvp-team-slots--dragging" : ""}`}>
        {team.map((slot, slotIndex) => {
          const spirit = slot.spiritId
            ? spiritById.get(slot.spiritId)
            : null;
          const isActive = activeSlot === slotIndex;
          const skillPool = slot.spiritId
            ? flattenSpiritSkills(skillMap[String(slot.spiritId)])
            : [];
          const coverageLines = getAttackCoverageFromSkills(
            slot.skills,
            skillCatalog,
            typeEffectiveness,
          );

          return (
            <li
              key={slotIndex}
              data-pvp-slot-index={slotIndex}
              className={[
                "pvp-team-slot",
                isActive ? "pvp-team-slot--active" : "",
                dragging && dragOver === slotIndex
                  ? "pvp-team-slot--drag-over"
                  : "",
                dragging && dragFrom === slotIndex
                  ? "pvp-team-slot--dragging"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => {
                if (dragging) return;
                onActiveSlotChange(slotIndex);
                onActiveSkillIndexChange(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (isSlotDragEvent(e.dataTransfer)) {
                  e.dataTransfer.dropEffect = "move";
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                const fromSlot = parseSlotDrag(e.dataTransfer);
                if (fromSlot !== null && fromSlot !== slotIndex) {
                  setTeam((prev) => reorderPvpTeam(prev, fromSlot, slotIndex));
                  onActiveSlotChange(
                    remapActiveSlotAfterReorder(activeSlot, fromSlot, slotIndex),
                  );
                  return;
                }
                const spiritId = parseSpiritDrag(e.dataTransfer);
                if (spiritId !== null) onAssignSpirit(slotIndex, spiritId);
                const skill = parseSkillDrag(e.dataTransfer);
                if (skill && slot.spiritId === skill.spiritId) {
                  const target =
                    activeSkillIndex ?? slot.skills.findIndex((s) => !s);
                  const idx = target >= 0 ? target : 0;
                  onAssignSkill(slotIndex, idx, skill.name, skill.spiritId);
                }
              }}
            >
              <div
                className="pvp-team-slot__order"
                title="按住拖动调整顺序"
                onMouseDown={(e) => {
                  if (e.button !== 0) return;
                  e.stopPropagation();
                  e.preventDefault();
                  beginDrag(slotIndex);
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="pvp-team-slot__drag" aria-hidden>
                  ⠿
                </span>
                <span className="pvp-team-slot__index">{slotIndex + 1}</span>
              </div>
              <div className="pvp-team-slot__body">
                <div className="pvp-team-slot__spirit">
                  {spirit ? (
                    <>
                      {showImages ? (
                        <img src={spirit.立绘链接} alt="" />
                      ) : null}
                      <span className="pvp-team-slot__name">{spirit.名称}</span>
                      <button
                        type="button"
                        className="pvp-team-slot__clear"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClearSlot(slotIndex);
                        }}
                        aria-label="移除精灵"
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <span className="pvp-team-slot__empty">选精灵</span>
                  )}
                </div>
                <div className="pvp-team-slot__skills">
                  {Array.from(
                    { length: PVP_SKILLS_PER_SPIRIT },
                    (_, skillIndex) => {
                      const skillName = slot.skills[skillIndex];
                      const skillEntry = skillPool.find(
                        (s) => s.name === skillName,
                      );
                      const skillActive =
                        isActive && activeSkillIndex === skillIndex;

                      const skillDesc = skillName
                        ? getSkillDisplayText(skillCatalog, skillName)
                        : null;
                      const skillMeta = skillName
                        ? skillCatalog[skillName]
                        : null;
                      const energyLabel = formatSkillEnergy(skillMeta);
                      const powerLabel = formatSkillPower(skillMeta);
                      const countsCoverage = skillName
                        ? isCoverageAttackSkill(skillCatalog[skillName])
                        : false;

                      return (
                        <div
                          key={skillIndex}
                          className={`pvp-skill-slot${skillActive ? " pvp-skill-slot--active" : ""}${skillName && !countsCoverage ? " pvp-skill-slot--no-coverage" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onActiveSlotChange(slotIndex);
                            onActiveSkillIndexChange(skillIndex);
                          }}
                          onDragOver={(e) => {
                            if (!slot.spiritId) return;
                            e.preventDefault();
                          }}
                          onDrop={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const skill = parseSkillDrag(e.dataTransfer);
                            if (skill && slot.spiritId === skill.spiritId) {
                              onAssignSkill(
                                slotIndex,
                                skillIndex,
                                skill.name,
                                skill.spiritId,
                              );
                            }
                          }}
                        >
                          {skillName ? (
                            <>
                              <div className="pvp-skill-slot__title">
                                <span
                                  className="pvp-skill-slot__name"
                                  title={skillDesc ?? skillName}
                                >
                                  {skillName}
                                </span>
                                {energyLabel ? (
                                  <span className="pvp-skill-slot__energy">
                                    {energyLabel}
                                  </span>
                                ) : null}
                              </div>
                              {skillDesc ? (
                                <span
                                  className="pvp-skill-slot__desc"
                                  title={skillDesc}
                                >
                                  {skillDesc}
                                </span>
                              ) : null}
                              <div className="pvp-skill-slot__foot">
                                <div className="pvp-skill-slot__meta">
                                  {countsCoverage && skillEntry?.attr ? (
                                    <TypeChar attr={skillEntry.attr} />
                                  ) : null}
                                  {powerLabel ? (
                                    <span className="pvp-skill-slot__power">
                                      {powerLabel}
                                    </span>
                                  ) : null}
                                </div>
                                <button
                                  type="button"
                                  className="pvp-skill-slot__clear"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTeam((prev) =>
                                      prev.map((s, i) =>
                                        i === slotIndex
                                          ? {
                                              ...s,
                                              skills: assignSkillAt(
                                                s.skills,
                                                skillIndex,
                                                null,
                                              ),
                                            }
                                          : s,
                                      ),
                                    );
                                  }}
                                  aria-label="清空技能"
                                >
                                  ×
                                </button>
                              </div>
                            </>
                          ) : (
                            <span className="pvp-skill-slot__placeholder">
                              {skillIndex + 1}
                            </span>
                          )}
                        </div>
                      );
                    },
                  )}
                </div>
                {coverageLines.length > 0 ? (
                  <p className="pvp-team-slot__coverage">
                    <CoverageList
                      attrs={flattenCoverageTargets(
                        coverageLines,
                        typeEffectiveness.attributes,
                      )}
                    />
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <footer className="pvp-panel__summary">
        <div className="pvp-panel__summary-block">
          <span className="pvp-panel__summary-label">队伍打击面</span>
          <span className="pvp-panel__summary-value">
            <CoverageList attrs={teamCoverage.covered} />
          </span>
        </div>
        <div className="pvp-panel__summary-block pvp-panel__summary-block--gap">
          <span className="pvp-panel__summary-label">缺失打击面</span>
          <span className="pvp-panel__summary-value">
            {teamCoverage.missing.length > 0 ? (
              <CoverageList attrs={teamCoverage.missing} />
            ) : (
              <span className="coverage-display__ok">无</span>
            )}
          </span>
        </div>
      </footer>
    </aside>
  );
}
