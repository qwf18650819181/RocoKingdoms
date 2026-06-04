import { ALL_ATTRIBUTES } from "../data/attributes";
import { EGG_GROUP_ORDER, EGG_GROUP_SHORT } from "../data/eggGroups";
import type { Theme } from "../hooks/useAppSettings";
import type { SpiritFilters } from "../hooks/useSpirits";
import { type AttributeIconMap, type SpiritSortKey } from "../types/spirit";
import { AttributeIcon } from "./AttributeIcon";

interface Props {
  filters: SpiritFilters;
  onChange: (patch: Partial<SpiritFilters>) => void;
  total: number;
  shown: number;
  attributeIcons: AttributeIconMap;
  pvpOpen: boolean;
  onTogglePvp: () => void;
  skillListOpen: boolean;
  onToggleSkillList: () => void;
  onOpenTypeChart: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  showImages: boolean;
  onToggleShowImages: () => void;
}

const TOP_SORTS: { key: SpiritSortKey; label: string }[] = [
  { key: "种族值总和", label: "种族值" },
  { key: "id", label: "编号" },
  { key: "name", label: "名称" },
];

const BOTTOM_SORTS: { key: SpiritSortKey; label: string }[] = [
  { key: "生命", label: "血" },
  { key: "物攻", label: "物" },
  { key: "魔攻", label: "魔" },
  { key: "物防", label: "防" },
  { key: "魔防", label: "抗" },
  { key: "速度", label: "速" },
];

export function Toolbar({
  filters,
  onChange,
  total,
  shown,
  attributeIcons,
  pvpOpen,
  onTogglePvp,
  skillListOpen,
  onToggleSkillList,
  onOpenTypeChart,
  theme,
  onToggleTheme,
  showImages,
  onToggleShowImages,
}: Props) {
  const toggleAttr = (attr: string) => {
    onChange({
      primaryAttr: filters.primaryAttr === attr ? null : attr,
    });
  };

  const toggleEggGroup = (group: string) => {
    onChange({
      eggGroup: filters.eggGroup === group ? null : group,
    });
  };

  const renderSortBtn = (
    key: SpiritSortKey,
    label: string,
    wide?: boolean,
  ) => (
    <button
      key={key}
      type="button"
      className={[
        "toolbar__sort-btn",
        wide ? "toolbar__sort-btn--wide" : "",
        filters.sort === key ? " toolbar__sort-btn--active" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      title={label}
      onClick={() => onChange({ sort: key })}
    >
      {label}
    </button>
  );

  return (
    <header className="toolbar">
      <div className="toolbar__bar">
        <div className="toolbar__brand">
          <h1>洛克王国 · 精灵图鉴</h1>
          <span className="toolbar__count">
            {shown} / {total}
          </span>
          <div className="toolbar__brand-actions">
            <div className="toolbar__brand-actions-row">
              <button
                type="button"
                className={`toolbar__mode-btn toolbar__theme${theme === "dark" ? " toolbar__theme--dark" : ""}`}
                title={theme === "light" ? "切换为深色主题" : "切换为浅色主题"}
                onClick={onToggleTheme}
              >
                {theme === "light" ? "深色" : "浅色"}
              </button>
              <button
                type="button"
                className={`toolbar__mode-btn toolbar__images${showImages ? " toolbar__images--on" : ""}`}
                title={showImages ? "隐藏立绘图片" : "显示立绘图片"}
                onClick={onToggleShowImages}
              >
                {showImages ? "有图" : "无图"}
              </button>
              <button
                type="button"
                className="toolbar__mode-btn toolbar__type-chart"
                title="属性克制表"
                onClick={onOpenTypeChart}
              >
                克制
              </button>
            </div>
            <div className="toolbar__brand-actions-row">
              <button
                type="button"
                className={`toolbar__mode-btn toolbar__skill-list${skillListOpen ? " toolbar__skill-list--active" : ""}`}
                title={skillListOpen ? "关闭技能列表" : "打开技能列表"}
                onClick={onToggleSkillList}
              >
                {skillListOpen ? "关技能" : "技能"}
              </button>
              <button
                type="button"
                className={`toolbar__mode-btn toolbar__pvp${pvpOpen ? " toolbar__pvp--active" : ""}`}
                title={pvpOpen ? "关闭 PVP 配队" : "打开 PVP 配队"}
                onClick={onTogglePvp}
              >
                {pvpOpen ? "关配队" : "配队"}
              </button>
            </div>
          </div>
        </div>

        <span className="toolbar__tool-sep" aria-hidden />

        <div className="toolbar__tool-section" role="group" aria-label="属性筛选">
          <div className="toolbar__attr-grid">
            {ALL_ATTRIBUTES.map((attr) => (
              <button
                key={attr}
                type="button"
                className={`toolbar__attr-btn${filters.primaryAttr === attr ? " toolbar__attr-btn--active" : ""}`}
                title={attr}
                aria-label={attr}
                aria-pressed={filters.primaryAttr === attr}
                onClick={() => toggleAttr(attr)}
              >
                <AttributeIcon
                  attr={attr}
                  iconUrl={attributeIcons[attr]}
                  size={18}
                />
              </button>
            ))}
          </div>
        </div>

        <span className="toolbar__tool-sep" aria-hidden />

        <div className="toolbar__tool-section" role="group" aria-label="排序">
          <div className="toolbar__sort-grid">
            {TOP_SORTS.map(({ key, label }) => renderSortBtn(key, label, true))}
            {BOTTOM_SORTS.map(({ key, label }) => renderSortBtn(key, label))}
          </div>
        </div>

        <span className="toolbar__tool-sep" aria-hidden />

        <div className="toolbar__search-block">
          <div className="toolbar__egg-row" role="group" aria-label="蛋组筛选">
            {EGG_GROUP_ORDER.map((group) => (
              <button
                key={group}
                type="button"
                className={`toolbar__egg-btn${filters.eggGroup === group ? " toolbar__egg-btn--active" : ""}`}
                title={group}
                aria-pressed={filters.eggGroup === group}
                onClick={() => toggleEggGroup(group)}
              >
                {EGG_GROUP_SHORT[group]}
              </button>
            ))}
          </div>
          <input
            type="search"
            className="search-input toolbar__search"
            placeholder="搜索精灵…"
            value={filters.query}
            onChange={(e) => onChange({ query: e.target.value })}
          />
        </div>
      </div>
    </header>
  );
}
