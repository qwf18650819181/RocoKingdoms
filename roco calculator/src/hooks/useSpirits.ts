import { useEffect, useMemo, useState } from "react";

import {
  applyEvolutionLineStageFix,
  isDisplayFinalSpirit,
  normalizeStage,
  resolveSpiritStage,
  spiritLineKey,
} from "../utils/normalize";
import { applyEggGroupInheritance } from "../utils/eggGroup";

import type {

  AttributeIconMap,

  Spirit,

  SpiritSkills,

  SpiritSortKey,

} from "../types/spirit";

import type { TypeEffectivenessData } from "../types/typeEffectiveness";

import type { SkillCatalogMap } from "../types/skillScore";



export interface SpiritFilters {

  query: string;

  /** 主/副属性单选，null 表示全部 */

  primaryAttr: string | null;

  /** 双击技能列表后，只显示拥有该技能的精灵 */

  skillName: string | null;

  /** 蛋组单选，null 表示全部 */

  eggGroup: string | null;

  sort: SpiritSortKey;

}



const DEFAULT_FILTERS: SpiritFilters = {

  query: "",

  primaryAttr: null,

  skillName: null,

  eggGroup: null,

  sort: "id",

};



const EMPTY_SKILLS: SpiritSkills = { 默认: [], 血脉: [], 技能石: [] };



function hasValidSerial(spirit: Spirit): boolean {

  const serial = spirit.序号;

  return typeof serial === "number" && Number.isFinite(serial) && serial > 0;

}






function matchesQuery(spirit: Spirit, q: string): boolean {

  if (!q) return true;

  const lower = q.toLowerCase();

  const haystack = [

    spirit.名称,

    spirit.页面标题,

    spirit.编号,

    String(spirit.序号),

    spirit.初阶名称 ?? "",

    spirit.特性 ?? "",

  ]

    .join(" ")

    .toLowerCase();

  return haystack.includes(lower);

}



function matchesAttr(spirit: Spirit, attr: string | null): boolean {
  if (!attr) return true;
  if (spirit.主属性 === attr) return true;
  if (spirit.副属性 === attr) return true;
  return false;
}

function matchesEggGroup(spirit: Spirit, eggGroup: string | null): boolean {
  if (!eggGroup) return true;
  return spirit.蛋组 === eggGroup;
}



function compareSpirits(

  a: Spirit,

  b: Spirit,

  sort: SpiritSortKey,

): number {

  if (sort === "id") return a.id - b.id;

  if (sort === "name") return a.名称.localeCompare(b.名称, "zh-CN");

  return b[sort] - a[sort];

}



export function useSpirits() {

  const [spirits, setSpirits] = useState<Spirit[]>([]);
  /** 含各进化阶段的完整数据，供详情页进化图示使用 */
  const [evolutionPool, setEvolutionPool] = useState<Spirit[]>([]);

  const [skillMap, setSkillMap] = useState<Record<string, SpiritSkills>>({});

  const [attributeIcons, setAttributeIcons] = useState<AttributeIconMap>({});

  const [typeEffectiveness, setTypeEffectiveness] =

    useState<TypeEffectivenessData | null>(null);

  const [skillCatalog, setSkillCatalog] = useState<SkillCatalogMap>({});

  const [statIcons, setStatIcons] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<SpiritFilters>(DEFAULT_FILTERS);

  const [selectedId, setSelectedId] = useState<number | null>(null);



  useEffect(() => {

    let cancelled = false;

    (async () => {

      try {

        const [spiritsRes, skillsRes, iconsRes, typeEffRes, catalogRes, statIconRes] =

          await Promise.all([

            fetch("/data/spirits.json"),

            fetch("/data/spirit_skills.json"),

            fetch("/data/attribute_icons.json"),

            fetch("/data/type_effectiveness.json"),

            fetch("/data/skills.json"),

            fetch("/data/stat_icons.json"),

          ]);

        if (!spiritsRes.ok) throw new Error(`精灵数据加载失败 (${spiritsRes.status})`);

        const raw = (await spiritsRes.json()) as Spirit[];

        const valid = raw.filter(hasValidSerial);

        const serialToStage = new Map<number, string>();
        for (const s of valid) {
          serialToStage.set(s.序号, normalizeStage(s.精灵阶段));
        }

        const resolved: Spirit[] = applyEggGroupInheritance(
          applyEvolutionLineStageFix(
            valid.map((s) => ({
              ...s,
              精灵阶段: resolveSpiritStage(s, serialToStage),
            })),
          ),
        );

        const lineGroups = new Map<string, typeof resolved>();
        for (const s of resolved) {
          const key = spiritLineKey(s);
          const list = lineGroups.get(key);
          if (list) list.push(s);
          else lineGroups.set(key, [s]);
        }

        const data = resolved.filter((s) =>
          isDisplayFinalSpirit(s, lineGroups.get(spiritLineKey(s)) ?? [s]),
        );

        let skills: Record<string, SpiritSkills> = {};

        if (skillsRes.ok) {

          const allSkills = (await skillsRes.json()) as Record<

            string,

            SpiritSkills

          >;

          const validIds = new Set(data.map((s) => String(s.id)));

          for (const id of validIds) {

            if (allSkills[id]) skills[id] = allSkills[id];

          }

        }

        const icons = iconsRes.ok

          ? ((await iconsRes.json()) as AttributeIconMap)

          : {};

        const typeEff = typeEffRes.ok

          ? ((await typeEffRes.json()) as TypeEffectivenessData)

          : null;

        const catalog = catalogRes.ok

          ? ((await catalogRes.json()) as SkillCatalogMap)

          : {};

        const statIconMap = statIconRes.ok

          ? ((await statIconRes.json()) as Record<string, string>)

          : {};

        if (!cancelled) {

          setSpirits(data);
          setEvolutionPool(resolved);

          setSkillMap(skills);

          setAttributeIcons(icons);

          setTypeEffectiveness(typeEff);

          setSkillCatalog(catalog);

          setStatIcons(statIconMap);

          setSelectedId(data[0]?.id ?? null);

        }

      } catch (e) {

        if (!cancelled) {

          setError(e instanceof Error ? e.message : "未知错误");

        }

      } finally {

        if (!cancelled) setLoading(false);

      }

    })();

    return () => {

      cancelled = true;

    };

  }, []);



  const skillSpiritIds = useMemo(() => {
    const map = new Map<string, Set<number>>();
    for (const [idStr, skills] of Object.entries(skillMap)) {
      const id = Number(idStr);
      if (!Number.isFinite(id)) continue;
      for (const source of ["默认", "血脉", "技能石"] as const) {
        for (const row of skills[source] ?? []) {
          const name = row.name;
          if (!name) continue;
          let set = map.get(name);
          if (!set) {
            set = new Set();
            map.set(name, set);
          }
          set.add(id);
        }
      }
    }
    return map;
  }, [skillMap]);

  const filtered = useMemo(() => {

    const list = spirits.filter((s) => {

      if (!matchesAttr(s, filters.primaryAttr)) return false;

      if (!matchesEggGroup(s, filters.eggGroup)) return false;

      if (filters.skillName) {
        const ids = skillSpiritIds.get(filters.skillName);
        if (!ids?.has(s.id)) return false;
      }

      return matchesQuery(s, filters.query.trim());

    });

    list.sort((a, b) => compareSpirits(a, b, filters.sort));

    return list;

  }, [spirits, filters, skillSpiritIds]);



  const selected = useMemo(

    () => spirits.find((s) => s.id === selectedId) ?? null,

    [spirits, selectedId],

  );



  const selectedSkills = useMemo(() => {

    if (!selectedId) return null;

    return skillMap[String(selectedId)] ?? EMPTY_SKILLS;

  }, [skillMap, selectedId]);



  return {

    spirits,

    evolutionPool,

    filtered,

    loading,

    error,

    filters,

    setFilters,

    selected,

    selectedSkills,

    skillMap,

    attributeIcons,

    typeEffectiveness,

    skillCatalog,

    statIcons,

    selectedId,

    setSelectedId,

  };

}


