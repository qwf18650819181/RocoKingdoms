import { useMemo } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { SpiritEvolutionDiagram } from "./SpiritEvolutionDiagram";
import { SpiritRadarChart } from "./SpiritRadarChart";
import { SpiritSkills } from "./SpiritSkills";
import { buildEvolutionChain } from "../utils/evolutionChain";
import { ATTRIBUTE_COLORS } from "../data/attributes";
import { ROLE_TAG_COLORS } from "../data/tagColors";
import {
  buildStatThresholds,
  computeSpiritTags,
  STAT_TAG_MAP,
} from "../utils/spiritTags";
import {
  STAT_KEYS,
  type AttributeIconMap,
  type Spirit,
  type SpiritSkills as SpiritSkillsData,
} from "../types/spirit";
import type { SkillCatalogMap } from "../types/skillScore";
import type { TypeEffectivenessData } from "../types/typeEffectiveness";
import type { PvpSkillSlots } from "../types/pvp";

interface Props {
  spirit: Spirit | null;
  skills: SpiritSkillsData | null;
  showImages?: boolean;
  attributeIcons: AttributeIconMap;
  statIcons: Record<string, string>;
  allSpirits: Spirit[];
  evolutionPool: Spirit[];
  skillCatalog: SkillCatalogMap;
  typeEffectiveness: TypeEffectivenessData | null;
  layoutFocus: "list" | "detail";
  showLayoutToggle?: boolean;
  onToggleLayoutFocus?: () => void;
  onSpiritSelect?: (id: number) => void;
  pvpPickSkills?: boolean;
  pvpSlotSkills?: PvpSkillSlots;
  pvpActiveSkillIndex?: number | null;
  onPvpSkillPick?: (skillName: string) => void;
  onShowSkillTypeChart?: (attr: string) => void;
}

function AttrBadge({ name }: { name: string }) {
  return (
    <span
      className="attr-badge attr-badge--lg"
      style={{ backgroundColor: ATTRIBUTE_COLORS[name] ?? "#888" }}
    >
      {name}
    </span>
  );
}

function SpiritStatsBlock({
  spirit,
  spiritTags,
  statIcons,
  maxStat,
}: {
  spirit: Spirit;
  spiritTags: ReturnType<typeof computeSpiritTags>;
  statIcons: Record<string, string>;
  maxStat: number;
}) {
  return (
    <section className="detail-section detail-section--stats">
      <h3>
        种族值 <span className="bst-total">{spirit.种族值总和}</span>
      </h3>
      <SpiritRadarChart
        spirit={spirit}
        spiritTags={spiritTags}
        statIcons={statIcons}
      />
      <ul className="stat-bars">
        {STAT_KEYS.map((key) => {
          const val = spirit[key];
          const pct = maxStat > 0 ? (val / maxStat) * 100 : 0;
          const tag = STAT_TAG_MAP[key];
          const tagged = tag ? spiritTags.includes(tag) : false;
          return (
            <li key={key}>
              <span className="stat-bars__label">{key}</span>
              <div className="stat-bars__track">
                <div
                  className={`stat-bars__fill${tagged ? " stat-bars__fill--tagged" : ""}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="stat-bars__value">{val}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function SpiritDetail({
  spirit,
  skills,
  showImages = true,
  attributeIcons,
  statIcons,
  allSpirits,
  evolutionPool,
  skillCatalog,
  typeEffectiveness,
  layoutFocus,
  showLayoutToggle,
  onToggleLayoutFocus,
  onSpiritSelect,
  pvpPickSkills,
  pvpSlotSkills,
  pvpActiveSkillIndex,
  onPvpSkillPick,
  onShowSkillTypeChart,
}: Props) {
  const statThresholds = useMemo(
    () => buildStatThresholds(allSpirits),
    [allSpirits],
  );

  const spiritTags = useMemo(() => {
    if (!spirit) return [];
    return computeSpiritTags(spirit, statThresholds);
  }, [spirit, statThresholds]);

  const evolutionChain = useMemo(() => {
    if (!spirit) return [];
    return buildEvolutionChain(spirit, evolutionPool);
  }, [spirit, evolutionPool]);

  if (!spirit) {
    return (
      <aside className="detail-panel detail-panel--empty">
        <p>选择一只精灵查看详情</p>
      </aside>
    );
  }

  const maxStat = Math.max(...STAT_KEYS.map((k) => spirit[k]), 1);

  return (
    <aside
      className={`detail-panel detail-panel--${layoutFocus}-layout`}
      data-layout-focus={layoutFocus}
    >
      {showLayoutToggle && onToggleLayoutFocus ? (
        <button
          type="button"
          className="detail-panel__layout-toggle"
          onClick={onToggleLayoutFocus}
          title={
            layoutFocus === "list"
              ? "切换为宽松布局（技能三列）"
              : "切换为紧凑布局（技能 Tab）"
          }
          aria-label={
            layoutFocus === "list" ? "切换为宽松" : "切换为紧凑"
          }
        >
          {layoutFocus === "list" ? "宽松" : "紧凑"}
        </button>
      ) : null}
      <div className="detail-panel__layout">
        <div className="detail-panel__top">
          <div className="detail-panel__info">
            <div className="detail-panel__hero">
              {showImages ? (
                <img src={spirit.立绘链接} alt={spirit.名称} />
              ) : (
                <div className="detail-panel__hero-placeholder" aria-hidden>
                  #{spirit.编号}
                </div>
              )}
              <div>
                <h2>{spirit.名称}</h2>
                <p className="detail-panel__subtitle">
                  #{spirit.编号} · {spirit.精灵阶段}
                  {spirit.地区形态 ? ` · ${spirit.地区形态}` : ""}
                </p>
                <div className="detail-panel__attrs">
                  <AttrBadge name={spirit.主属性} />
                  {spirit.副属性 ? (
                    <AttrBadge name={spirit.副属性} />
                  ) : null}
                </div>
              </div>
            </div>

            {spirit.特性 ? (
              <section className="detail-section">
                <h3>特性 · {spirit.特性}</h3>
                <p>{spirit.特性描述 || "—"}</p>
              </section>
            ) : null}

            {spiritTags.length > 0 ? (
              <section className="detail-section">
                <h3>定位标签</h3>
                <ul className="spirit-tags">
                  {spiritTags.map((tag) => {
                    const colors = ROLE_TAG_COLORS[tag];
                    return (
                    <li key={tag}>
                      <span
                        className="spirit-tags__badge"
                        style={{
                          backgroundColor: colors.bg,
                          color: colors.text,
                          borderColor: colors.border,
                        }}
                      >
                        {tag}
                      </span>
                    </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            <section className="detail-section detail-section--grid">
              {spirit.初阶名称 ? (
                <div>
                  <span className="label">进化链</span>
                  <span>{spirit.初阶名称}</span>
                </div>
              ) : null}
              {spirit.进化条件 ? (
                <div>
                  <span className="label">进化条件</span>
                  <span>{spirit.进化条件}</span>
                </div>
              ) : null}
              <div>
                <span className="label">蛋组</span>
                <span>{spirit.蛋组 ?? "—"}</span>
              </div>
              {spirit.体型 ? (
                <div>
                  <span className="label">体型</span>
                  <span>{spirit.体型}</span>
                </div>
              ) : null}
              {spirit.重量 ? (
                <div>
                  <span className="label">重量</span>
                  <span>{spirit.重量}</span>
                </div>
              ) : null}
              {spirit.是否有异色 ? (
                <div>
                  <span className="label">异色</span>
                  <span>{spirit.是否有异色}</span>
                </div>
              ) : null}
              {spirit.分布地区 ? (
                <div className="detail-section--full">
                  <span className="label">分布</span>
                  <span>{spirit.分布地区}</span>
                </div>
              ) : null}
            </section>

            <SpiritEvolutionDiagram
              chain={evolutionChain}
              currentId={spirit.id}
              showImages={showImages}
              onSelectSpirit={onSpiritSelect}
            />

            {spirit.页面链接 ? (
              <button
                type="button"
                className="wiki-link"
                onClick={() => openUrl(spirit.页面链接)}
              >
                打开 Wiki 页面
              </button>
            ) : null}
          </div>

          <div className="detail-panel__stats">
            <SpiritStatsBlock
              spirit={spirit}
              spiritTags={spiritTags}
              statIcons={statIcons}
              maxStat={maxStat}
            />
          </div>
        </div>

        <div className="detail-panel__skills">
          <SpiritSkills
            spirit={spirit}
            spiritTags={spiritTags}
            skills={skills}
            attributeIcons={attributeIcons}
            skillCatalog={skillCatalog}
            typeEffectiveness={typeEffectiveness}
            pvpPickSkills={pvpPickSkills}
            pvpSlotSkills={pvpSlotSkills}
            pvpActiveSkillIndex={pvpActiveSkillIndex}
            onPvpSkillPick={onPvpSkillPick}
            onShowSkillTypeChart={onShowSkillTypeChart}
            layoutFocus={layoutFocus}
          />
        </div>
      </div>
    </aside>
  );
}
