import { useEffect, useMemo, useState } from "react";
import { AttributeIcon } from "./AttributeIcon";
import { DRAG_SKILL, type PvpSkillDragPayload } from "../types/pvp";
import {
  formatSkillEnergyPower,
  getSkillDisplayText,
  getSkillTypeChartAttr,
  scoreSpiritSkill,
} from "../utils/skillScore";
import {
  SKILL_SOURCES,
  type AttributeIconMap,
  type SkillSource,
  type Spirit,
  type SpiritSkillEntry,
  type SpiritSkills,
} from "../types/spirit";
import type { SkillCatalogMap, SpiritRoleTag } from "../types/skillScore";
import type { TypeEffectivenessData } from "../types/typeEffectiveness";
import type { PvpSkillSlots } from "../types/pvp";

const SOURCE_LABELS: Record<SkillSource, string> = {
  默认: "默认",
  血脉: "血脉",
  技能石: "技能石",
};

interface Props {
  spirit: Spirit;
  spiritTags: SpiritRoleTag[];
  skills: SpiritSkills | null;
  attributeIcons: AttributeIconMap;
  skillCatalog: SkillCatalogMap;
  typeEffectiveness: TypeEffectivenessData | null;
  layoutFocus: "list" | "detail";
  pvpPickSkills?: boolean;
  pvpSlotSkills?: PvpSkillSlots;
  pvpActiveSkillIndex?: number | null;
  onPvpSkillPick?: (skillName: string) => void;
  onShowSkillTypeChart?: (attr: string) => void;
}

function SkillRow({
  source,
  skill,
  score,
  attributeIcons,
  skillCatalog,
  spiritId,
  pvpPickSkills,
  skillAlreadyUsed,
  onPvpSkillPick,
  onShowSkillTypeChart,
}: {
  source: SkillSource;
  skill: SpiritSkillEntry;
  score: ReturnType<typeof scoreSpiritSkill>;
  attributeIcons: AttributeIconMap;
  skillCatalog: SkillCatalogMap;
  spiritId: number;
  pvpPickSkills?: boolean;
  skillAlreadyUsed?: boolean;
  onPvpSkillPick?: (skillName: string) => void;
  onShowSkillTypeChart?: (attr: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const canPvpPick = Boolean(
    pvpPickSkills && onPvpSkillPick && !skillAlreadyUsed,
  );
  const dragPayload: PvpSkillDragPayload = { spiritId, name: skill.name };

  const handleRowClick = () => {
    if (canPvpPick) {
      onPvpSkillPick!(skill.name);
      return;
    }
    setOpen((v) => !v);
  };

  const scoreBoosts = score.reasons.filter((r) => r.multiplier !== 1);
  const skillDesc = getSkillDisplayText(skillCatalog, skill.name);
  const skillMeta = skillCatalog[skill.name];
  const energyPower = formatSkillEnergyPower(skillMeta);
  const chartAttr = getSkillTypeChartAttr(
    skill.name,
    skillCatalog,
    skill.attr,
    skillMeta?.category,
  );

  return (
    <li
      className={`skill-list__item${score.skipped && !pvpPickSkills ? " skill-list__item--muted" : ""}${canPvpPick ? " skill-list__item--pvp-pick" : ""}${skillAlreadyUsed ? " skill-list__item--pvp-used" : ""}`}
      draggable={canPvpPick}
      onDragStart={(e) => {
        if (!canPvpPick) return;
        e.dataTransfer.setData(DRAG_SKILL, JSON.stringify(dragPayload));
        e.dataTransfer.effectAllowed = "copy";
      }}
      onClick={handleRowClick}
      title={
        skillAlreadyUsed
          ? "该技能已在当前站位配置"
          : canPvpPick
            ? "点击加入当前站位技能"
            : score.skipped
              ? score.skipReason
              : "点击查看评分依据"
      }
    >
      <div className="skill-list__main">
        <div className="skill-list__head">
          {skill.attr ? (
            <AttributeIcon
              attr={skill.attr}
              iconUrl={attributeIcons[skill.attr]}
              size={18}
            />
          ) : null}
          <span className="skill-list__name">{skill.name}</span>
          {energyPower ? (
            <span className="skill-list__stats-tag">{energyPower}</span>
          ) : null}
          {source === "默认" && skill.level != null ? (
            <span className="skill-list__level">Lv.{skill.level}</span>
          ) : null}
        </div>
        <div className="skill-list__actions">
          {chartAttr && onShowSkillTypeChart ? (
            <button
              type="button"
              className="skill-panel__type-chart-btn"
              title={`查看「${chartAttr}」属性克制关系`}
              onClick={(e) => {
                e.stopPropagation();
                onShowSkillTypeChart(chartAttr);
              }}
            >
              克
            </button>
          ) : null}
          {score.skipped ? (
            <span
              className="skill-list__skip"
              title={score.skipReason}
              aria-label={score.skipReason}
              onClick={(e) => e.stopPropagation()}
            >
              —
            </span>
          ) : (
            <button
              type="button"
              className="skill-list__score-btn"
              title="点击查看评分依据"
              onClick={(e) => {
                e.stopPropagation();
                setOpen((v) => !v);
              }}
            >
              {score.score}
            </button>
          )}
        </div>
      </div>
      {skillDesc ? (
        <p className="skill-list__desc">{skillDesc}</p>
      ) : null}
      {open && !score.skipped && scoreBoosts.length === 0 ? (
        <p className="skill-list__reasons-note">仅基础</p>
      ) : null}
      {open && !score.skipped && scoreBoosts.length > 0 ? (
        <ul className="skill-list__reasons">
          {scoreBoosts.map((r) => (
            <li key={`${r.label}-${r.multiplier}`}>
              <span className="skill-list__reason-label">{r.label}</span>
              <span className="skill-list__reason-mult">×{r.multiplier}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function SkillColumn({
  source,
  items,
  spirit,
  spiritTags,
  attributeIcons,
  skillCatalog,
  typeEffectiveness,
  pvpPickSkills,
  usedSkillSet,
  onPvpSkillPick,
  onShowSkillTypeChart,
  showTitle = true,
}: {
  source: SkillSource;
  items: SpiritSkillEntry[];
  showTitle?: boolean;
  spirit: Spirit;
  spiritTags: SpiritRoleTag[];
  attributeIcons: AttributeIconMap;
  skillCatalog: SkillCatalogMap;
  typeEffectiveness: TypeEffectivenessData | null;
  pvpPickSkills?: boolean;
  usedSkillSet: Set<string>;
  onPvpSkillPick?: (skillName: string) => void;
  onShowSkillTypeChart?: (attr: string) => void;
}) {
  const scored = useMemo(() => {
    return items
      .map((skill) => ({
        skill,
        score: scoreSpiritSkill(
          skill,
          skillCatalog,
          spirit,
          spiritTags,
          typeEffectiveness,
        ),
      }))
      .sort((a, b) => {
        if (a.score.skipped !== b.score.skipped) {
          return a.score.skipped ? 1 : -1;
        }
        return b.score.score - a.score.score;
      });
  }, [items, spirit, spiritTags, skillCatalog, typeEffectiveness]);

  return (
    <div className="skill-column">
      {showTitle ? (
        <h4 className="skill-column__title">
          {SOURCE_LABELS[source]}
          <span className="skill-column__count">{items.length}</span>
        </h4>
      ) : null}
      {items.length === 0 ? (
        <p className="skill-empty">暂无</p>
      ) : (
        <ul className="skill-list">
          {scored.map(({ skill, score }) => (
            <SkillRow
              key={`${source}-${skill.name}-${skill.level ?? ""}`}
              source={source}
              skill={skill}
              score={score}
              attributeIcons={attributeIcons}
              skillCatalog={skillCatalog}
              spiritId={spirit.id}
              pvpPickSkills={pvpPickSkills}
              skillAlreadyUsed={usedSkillSet.has(skill.name)}
              onPvpSkillPick={onPvpSkillPick}
              onShowSkillTypeChart={onShowSkillTypeChart}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function pickDefaultTab(skills: SpiritSkills): SkillSource {
  for (const source of SKILL_SOURCES) {
    if ((skills[source]?.length ?? 0) > 0) return source;
  }
  return "默认";
}

export function SpiritSkills({
  spirit,
  spiritTags,
  skills,
  attributeIcons,
  skillCatalog,
  typeEffectiveness,
  pvpPickSkills,
  pvpSlotSkills,
  pvpActiveSkillIndex,
  onPvpSkillPick,
  onShowSkillTypeChart,
  layoutFocus,
}: Props) {
  const [activeTab, setActiveTab] = useState<SkillSource>("默认");

  const usedSkillSet = useMemo(() => {
    const set = new Set<string>();
    if (pvpSlotSkills) {
      pvpSlotSkills.forEach((name, index) => {
        if (name && index !== pvpActiveSkillIndex) set.add(name);
      });
    }
    return set;
  }, [pvpSlotSkills, pvpActiveSkillIndex]);

  if (!skills) return null;

  useEffect(() => {
    if (layoutFocus === "detail") return;
    setActiveTab(pickDefaultTab(skills));
  }, [spirit.id, skills, layoutFocus]);

  const columnProps = {
    spirit,
    spiritTags,
    attributeIcons,
    skillCatalog,
    typeEffectiveness,
    pvpPickSkills,
    usedSkillSet,
    onPvpSkillPick,
    onShowSkillTypeChart,
  };

  const hasAny = SKILL_SOURCES.some((s) => (skills[s]?.length ?? 0) > 0);
  if (!hasAny) {
    return (
      <section className="detail-section skill-columns-section">
        <h3>技能</h3>
        <p className="skill-empty">暂无技能数据</p>
      </section>
    );
  }

  if (layoutFocus === "detail") {
    return (
      <section className="detail-section skill-columns-section">
        <h3>技能</h3>
        <div className="skill-columns">
          {SKILL_SOURCES.map((source) => (
            <SkillColumn
              key={source}
              source={source}
              items={skills[source] ?? []}
              {...columnProps}
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="detail-section skill-tabs-section">
      <h3>技能</h3>
      <div className="skill-source-tabs" role="tablist" aria-label="技能来源">
        {SKILL_SOURCES.map((source) => {
          const count = skills[source]?.length ?? 0;
          return (
            <button
              key={source}
              type="button"
              role="tab"
              aria-selected={activeTab === source}
              className={`skill-source-tabs__btn${activeTab === source ? " skill-source-tabs__btn--active" : ""}`}
              onClick={() => setActiveTab(source)}
            >
              {SOURCE_LABELS[source]}
              <span className="skill-source-tabs__count">{count}</span>
            </button>
          );
        })}
      </div>
      <div className="skill-tab-panel" role="tabpanel">
        <SkillColumn
          source={activeTab}
          items={skills[activeTab] ?? []}
          showTitle={false}
          {...columnProps}
        />
      </div>
    </section>
  );
}
