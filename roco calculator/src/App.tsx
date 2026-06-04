import { useMemo, useState } from "react";
import { TypeEffectChartModal } from "./components/TypeEffectChartModal";
import { useAppSettings } from "./hooks/useAppSettings";
import { ALL_ATTRIBUTES } from "./data/attributes";
import { PvpTeamPanel } from "./components/PvpTeamPanel";
import { SkillListPanel } from "./components/SkillListPanel";
import { SpiritCard } from "./components/SpiritCard";
import { SpiritDetail } from "./components/SpiritDetail";
import { Toolbar } from "./components/Toolbar";
import { usePvpTeam } from "./hooks/usePvpTeam";
import { useSpirits } from "./hooks/useSpirits";
import { findSpiritTeamSlot, isSpiritInTeam } from "./utils/pvpTeam";

function App() {
  const { theme, showImages, toggleTheme, toggleShowImages } = useAppSettings();
  const [layoutFocus, setLayoutFocus] = useState<"list" | "detail">("list");
  const [pvpOpen, setPvpOpen] = useState(false);
  const [skillListOpen, setSkillListOpen] = useState(false);
  const [typeChartOpen, setTypeChartOpen] = useState(false);
  const [typeChartAttrs, setTypeChartAttrs] = useState<string[]>([]);

  const {
    spirits,
    evolutionPool,
    filtered,
    loading,
    error,
    filters,
    setFilters,
    selected,
    selectedSkills,
    attributeIcons,
    statIcons,
    typeEffectiveness,
    skillCatalog,
    skillMap,
    selectedId,
    setSelectedId,
  } = useSpirits();

  const spiritIds = useMemo(
    () => new Set(spirits.map((s) => s.id)),
    [spirits],
  );

  const {
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
    saveTeam,
    importTeamFromText,
    canPickSkillsFor,
    resetTeam,
  } = usePvpTeam(skillMap, spiritIds);

  const openTypeChart = (addAttr?: string | null) => {
    setTypeChartAttrs((prev) => {
      if (addAttr && ALL_ATTRIBUTES.includes(addAttr)) {
        if (prev.includes(addAttr)) return prev;
        return [...prev, addAttr];
      }
      if (prev.length > 0) return prev;
      const spiritAttrs = selected
        ? ([selected.主属性, selected.副属性].filter(Boolean) as string[])
        : [];
      return spiritAttrs.length > 0 ? spiritAttrs : prev;
    });
    setTypeChartOpen(true);
  };

  const toggleLayout = () => {
    setLayoutFocus((f) => (f === "list" ? "detail" : "list"));
  };

  const handleTogglePvp = () => {
    setPvpOpen((open) => {
      if (open) return false;
      if (!skillListOpen) setLayoutFocus("detail");
      return true;
    });
  };

  const handleToggleSkillList = () => {
    setSkillListOpen((open) => {
      if (open) {
        setFilters((f) => ({ ...f, skillName: null }));
      }
      return !open;
    });
  };

  const handleSkillDoubleClick = (name: string) => {
    setFilters((f) => ({ ...f, skillName: name }));
  };

  const handleClearLinkedSkill = () => {
    setFilters((f) => ({ ...f, skillName: null }));
  };

  const handleSpiritSelect = (id: number) => {
    setSelectedId(id);
    if (!pvpOpen) return;
    const existingSlot = findSpiritTeamSlot(team, id);
    if (existingSlot !== null) {
      setActiveSlot(existingSlot);
      setActiveSkillIndex(null);
      return;
    }
    assignSpiritToSlot(activeSlot, id);
  };

  const handleActiveSlotChange = (slotIndex: number) => {
    setActiveSlot(slotIndex);
    setActiveSkillIndex(null);
    const spiritId = team[slotIndex]?.spiritId;
    if (spiritId != null) setSelectedId(spiritId);
  };

  const activeSlotSkills = team[activeSlot]?.skills;

  if (loading) {
    return (
      <div className="app app--center">
        <p className="status-msg">正在加载精灵数据…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app app--center">
        <p className="status-msg status-msg--error">{error}</p>
        <p className="status-hint">
          请先运行：<code>npm run import-data</code>
        </p>
      </div>
    );
  }

  return (
    <div
      className={`app${showImages ? "" : " app--no-images"}`}
      data-theme={theme}
    >
      <Toolbar
        filters={filters}
        onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
        total={spirits.length}
        shown={filtered.length}
        attributeIcons={attributeIcons}
        pvpOpen={pvpOpen}
        onTogglePvp={handleTogglePvp}
        skillListOpen={skillListOpen}
        onToggleSkillList={handleToggleSkillList}
        onOpenTypeChart={() => openTypeChart()}
        theme={theme}
        onToggleTheme={toggleTheme}
        showImages={showImages}
        onToggleShowImages={toggleShowImages}
      />
      <TypeEffectChartModal
        open={typeChartOpen}
        onClose={() => setTypeChartOpen(false)}
        typeEffectiveness={typeEffectiveness}
        attributeIcons={attributeIcons}
        queryAttrs={typeChartAttrs}
        onQueryAttrsChange={setTypeChartAttrs}
      />
      <div className="app__workspace">
        <div
          className={[
            "app__main",
            skillListOpen ? "app__main--skill-list" : `app__main--${layoutFocus}-focus`,
            pvpOpen ? "app__main--pvp" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          data-layout-focus={skillListOpen ? "equal" : layoutFocus}
        >
          {skillListOpen ? (
            <SkillListPanel
              skillCatalog={skillCatalog}
              attributeIcons={attributeIcons}
              linkedSkillName={filters.skillName}
              onSkillDoubleClick={handleSkillDoubleClick}
              onClearLinkedSkill={handleClearLinkedSkill}
              onShowSkillTypeChart={(attr) => openTypeChart(attr)}
            />
          ) : null}
          <section className="grid-panel" aria-label="精灵列表">
            {filtered.length === 0 ? (
              <p className="empty-grid">没有匹配的精灵</p>
            ) : (
              <div className="spirit-grid">
                {filtered.map((spirit) => (
                  <SpiritCard
                    key={spirit.id}
                    spirit={spirit}
                    showImages={showImages}
                    active={spirit.id === selectedId}
                    pvpDraggable={
                      pvpOpen &&
                      !isSpiritInTeam(team, spirit.id, activeSlot)
                    }
                    pvpTeamTaken={
                      pvpOpen &&
                      isSpiritInTeam(team, spirit.id, activeSlot)
                    }
                    onSelect={handleSpiritSelect}
                  />
                ))}
              </div>
            )}
          </section>
          {!skillListOpen ? (
            <button
              type="button"
              className="layout-fold"
              onClick={toggleLayout}
              title={
                layoutFocus === "list" ? "放大详情区域" : "放大列表区域"
              }
              aria-label={
                layoutFocus === "list" ? "切换为详情为主" : "切换为列表为主"
              }
            >
              <span className="layout-fold__chevron" aria-hidden>
                {layoutFocus === "list" ? "‹" : "›"}
              </span>
            </button>
          ) : null}
          <SpiritDetail
            spirit={selected}
            skills={selectedSkills}
            showImages={showImages}
            attributeIcons={attributeIcons}
            statIcons={statIcons}
            allSpirits={spirits}
            evolutionPool={evolutionPool}
            skillCatalog={skillCatalog}
            typeEffectiveness={typeEffectiveness}
            layoutFocus={layoutFocus}
            showLayoutToggle
            onToggleLayoutFocus={toggleLayout}
            onSpiritSelect={handleSpiritSelect}
            pvpPickSkills={selectedId !== null && canPickSkillsFor(selectedId)}
            pvpSlotSkills={pvpOpen ? activeSlotSkills : undefined}
            pvpActiveSkillIndex={pvpOpen ? activeSkillIndex : undefined}
            onPvpSkillPick={
              pvpOpen && selectedId !== null
                ? (name) => pickSkillForActiveSlot(name, selectedId)
                : undefined
            }
            onShowSkillTypeChart={(attr) => openTypeChart(attr)}
          />
          {pvpOpen && typeEffectiveness ? (
            <PvpTeamPanel
              team={team}
              setTeam={setTeam}
              spirits={spirits}
              showImages={showImages}
              skillMap={skillMap}
              skillCatalog={skillCatalog}
              typeEffectiveness={typeEffectiveness}
              activeSlot={activeSlot}
              activeSkillIndex={activeSkillIndex}
              onActiveSlotChange={handleActiveSlotChange}
              onActiveSkillIndexChange={setActiveSkillIndex}
              onAssignSpirit={assignSpiritToSlot}
              onAssignSkill={assignSkillToSlot}
              onClearSlot={clearTeamSlot}
              onSaveTeam={saveTeam}
              onImportTeam={importTeamFromText}
              onClearTeam={resetTeam}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default App;
