import { useMemo, useState } from "react";
import { ALL_ATTRIBUTES } from "../data/attributes";
import type { AttributeIconMap } from "../types/spirit";
import type { SkillCatalogMap } from "../types/skillScore";
import {
  formatSkillEnergyPower,
  getSkillDisplayText,
  getSkillSearchHaystack,
  getSkillTypeChartAttr,
  normalizeSkillSearchText,
} from "../utils/skillScore";
import { AttributeIcon } from "./AttributeIcon";

const SKILL_CATEGORIES = ["物攻", "魔攻", "状态", "防御"] as const;

interface Props {
  skillCatalog: SkillCatalogMap;
  attributeIcons: AttributeIconMap;
  linkedSkillName: string | null;
  onSkillDoubleClick: (name: string) => void;
  onClearLinkedSkill: () => void;
  onShowSkillTypeChart: (attr: string) => void;
}

export function SkillListPanel({
  skillCatalog,
  attributeIcons,
  linkedSkillName,
  onSkillDoubleClick,
  onClearLinkedSkill,
  onShowSkillTypeChart,
}: Props) {
  const [query, setQuery] = useState("");
  const [attrFilter, setAttrFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const allSkills = useMemo(() => {
    return Object.entries(skillCatalog)
      .map(([name, meta]) => ({
        name,
        ...meta,
        searchHaystack: getSkillSearchHaystack(skillCatalog, name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  }, [skillCatalog]);

  const filtered = useMemo(() => {
    const q = normalizeSkillSearchText(query.trim());
    return allSkills.filter((sk) => {
      if (attrFilter && sk.attr !== attrFilter) return false;
      if (categoryFilter && sk.category !== categoryFilter) return false;
      if (!q) return true;
      return sk.searchHaystack.includes(q);
    });
  }, [allSkills, attrFilter, categoryFilter, query]);

  const toggleAttr = (attr: string) => {
    setAttrFilter((prev) => (prev === attr ? null : attr));
  };

  const toggleCategory = (cat: string) => {
    setCategoryFilter((prev) => (prev === cat ? null : cat));
  };

  return (
    <section className="skill-panel" aria-label="技能列表">
      <div className="skill-panel__header">
        <h2 className="skill-panel__title">技能列表</h2>
        <span className="skill-panel__count">
          {filtered.length} / {allSkills.length}
        </span>
      </div>

      <input
        type="search"
        className="skill-panel__search"
        placeholder="搜索…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="skill-panel__filters">
        <p className="skill-panel__filter-label">属性</p>
        <div className="skill-panel__attr-grid" role="group" aria-label="属性筛选">
          {ALL_ATTRIBUTES.map((attr) => (
            <button
              key={attr}
              type="button"
              className={`skill-panel__attr-btn${attrFilter === attr ? " skill-panel__attr-btn--active" : ""}`}
              title={attr}
              aria-label={attr}
              aria-pressed={attrFilter === attr}
              onClick={() => toggleAttr(attr)}
            >
              <AttributeIcon
                attr={attr}
                iconUrl={attributeIcons[attr]}
                size={20}
              />
            </button>
          ))}
        </div>

        <p className="skill-panel__filter-label">类型</p>
        <div className="skill-panel__cat-row" role="group" aria-label="技能类型筛选">
          {SKILL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`skill-panel__cat-btn${categoryFilter === cat ? " skill-panel__cat-btn--active" : ""}`}
              aria-pressed={categoryFilter === cat}
              onClick={() => toggleCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {linkedSkillName ? (
        <div className="skill-panel__linked">
          <span className="skill-panel__linked-text" title={linkedSkillName}>
            联动：<strong>{linkedSkillName}</strong>
          </span>
          <button
            type="button"
            className="skill-panel__linked-clear"
            onClick={onClearLinkedSkill}
          >
            清除
          </button>
        </div>
      ) : (
        <p className="skill-panel__hint">双击筛选精灵</p>
      )}

      <ul className="skill-panel__list">
        {filtered.length === 0 ? (
          <li className="skill-panel__empty">没有匹配的技能</li>
        ) : (
          filtered.map((sk) => {
            const stats = formatSkillEnergyPower(skillCatalog[sk.name]);
            const chartAttr = getSkillTypeChartAttr(
              sk.name,
              skillCatalog,
              sk.attr,
              sk.category,
            );
            return (
            <li
              key={sk.name}
              className={`skill-panel__item${linkedSkillName === sk.name ? " skill-panel__item--linked" : ""}`}
              onDoubleClick={() => onSkillDoubleClick(sk.name)}
              title="双击联动精灵列表"
            >
              <div className="skill-panel__item-main">
                {sk.attr ? (
                  <AttributeIcon
                    attr={sk.attr}
                    iconUrl={attributeIcons[sk.attr]}
                    size={18}
                  />
                ) : (
                  <span className="skill-panel__item-no-attr" aria-hidden />
                )}
                <span className="skill-panel__item-name">{sk.name}</span>
                {stats ? (
                  <span className="skill-list__stats-tag">{stats}</span>
                ) : null}
                {sk.category ? (
                  <span className={`skill-panel__item-cat skill-panel__item-cat--${sk.category}`}>
                    {sk.category}
                  </span>
                ) : null}
                {chartAttr ? (
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
              </div>
              {getSkillDisplayText(skillCatalog, sk.name) ? (
                <p className="skill-panel__item-desc">
                  {getSkillDisplayText(skillCatalog, sk.name)}
                </p>
              ) : null}
            </li>
            );
          })
        )}
      </ul>
    </section>
  );
}
