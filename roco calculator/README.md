# 洛克王国 · 精灵图鉴

[![Tauri](https://img.shields.io/badge/Tauri-2.x-24C8DB?logo=tauri)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite)](https://vite.dev/)

面向《洛克王国》的本地桌面精灵图鉴与配队工具。数据来自 [BWIKI](https://wiki.biligame.com/roco/) 等公开资料，经 [`roco spider`](../roco%20spider/) 爬虫导出后，由本仓库导入为离线 JSON，无需联网即可浏览、筛选与组队。

本目录为 monorepo [**roco kingdom**](../README.md) 子项目之一；自动化 PVP 见 [`roco pvp`](../roco%20pvp/README.md)。

> 本项目为爱好者工具，与腾讯 / 洛克王国官方无关。精灵名称、立绘与数据版权归原权利方所有。

---

## 功能概览

### 精灵浏览

- 网格卡片浏览全部精灵（立绘、编号、主/副属性、种族值总和）
- 搜索名称、编号、特性等字段
- 按主属性筛选；按蛋组单字快捷筛选
- 多种排序：编号、名称、种族值总和、六项种族单项
- 详情页：立绘、进化链（可点击切换形态）、种族值雷达图、特性、蛋组、分布、Wiki 外链
- 技能分区：**默认 / 血脉 / 技能石**；支持 **紧凑（Tab）** 与 **宽松（三列）** 布局切换
- 技能评分与说明展开；物攻/魔攻技能可联动克制图

### 全局技能列表

- 独立技能面板，按属性、类别（物攻/魔攻/状态/防御）筛选
- 搜索技能名、效果、描述
- 双击技能名联动精灵列表筛选
- 显示能耗/威力（`耗` / `威`）

### 属性克制图

- 应用内可拖动浮窗，不遮挡主界面操作
- 三列矩阵：左「被克」· 中「查询属性（可多选）」· 右「克制」
- 中间列多选叠加关系；右侧为克制目标并集
- 左侧多选时按 **双属性防御** 合计（与 BWIKI 规则一致）：单属克、双属抵抗会合并为中性，不误标
- 仅当每个选中属性单独都被某攻击系克制时，显示 **×2** 共克标识
- 从工具栏、技能「克」按钮打开；打开时自动带入当前精灵主/副属性

### PVP 配队

- 6 格队伍，拖放或点击分配精灵与技能（每格 4 技能）
- 左侧 **⠿** 拖动调整站位；支持保存 / 导入 / **清空队伍** JSON
- 打击面统计（物攻/魔攻技能合并）；缺失属性提示
- 技能槽显示属性、耗/威；配队与详情、列表联动切换当前站位

### 界面

- 深色 / 浅色主题（持久化）
- 有图 / 无图模式（隐藏立绘，保留属性图标）

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面壳 | [Tauri 2](https://tauri.app/) |
| 前端 | React 19 + TypeScript + Vite 7 |
| 数据导入 | Python 3 + pandas |
| 数据来源 | `roco spider` CSV → `public/data/*.json` |

---

## 环境要求

- **Node.js** 18+（推荐 20+）
- **npm** 9+
- **Rust**（仅 Tauri 构建/开发需要，见 [Tauri 前置依赖](https://tauri.app/start/prerequisites/)）
- **Python** 3.9+（运行 `import-data`）
- **Windows**：当前主要开发与打包环境（NSIS 安装包）

---

## 快速开始

### 1. 准备数据

先在同级目录 [`roco spider`](../roco%20spider/) 完成爬虫，生成 `output/csv/` 等文件。

```bash
cd "roco calculator"
npm install
npm run import-data
```

导入结果：

- `public/data/spirits.json` — 精灵基础数据
- `public/data/spirit_skills.json` — 各精灵技能表
- `public/data/skills.json` — 全局技能目录
- `public/data/type_effectiveness.json` — 属性克制
- `public/icons/` — 属性 / 种族值图标

无有效 **序号** 的 CSV 行会在导入时跳过。

### 2. 开发（推荐）

```bash
npm run tauri:dev
```

同时启动 Vite（`http://localhost:1420`）与桌面窗口。

> **注意**：不要单独双击 `src-tauri/target/debug/roco-calculator.exe`，否则会因未启动前端服务而出现「localhost 拒绝连接」。

仅浏览器预览（无 Tauri 能力）：

```bash
npm run dev
# 另开终端需已执行 import-data
```

### 3. 构建发布版

```bash
npm run import-data
npm run tauri:build
npm run patch-icon   # 建议：修正 exe 图标（路径含空格时尤其需要）
```

| 产物 | 路径 |
|------|------|
| 可执行文件 | `src-tauri/target/release/roco-calculator.exe` |
| NSIS 安装包 | `src-tauri/target/release/bundle/nsis/*-setup.exe` |

日常本地运行：

```bash
npm run run:release
```

---

## 项目结构

```
roco calculator/
├── public/
│   ├── data/              # import-data 生成的 JSON
│   └── icons/             # 属性、种族值图标
├── scripts/
│   ├── import_data.py     # CSV → JSON 主脚本
│   ├── generate_app_icon.py
│   └── patch_exe_icon.mjs
├── src/
│   ├── components/        # UI 组件（详情、配队、克制图等）
│   ├── hooks/             # useSpirits、usePvpTeam、useAppSettings 等
│   ├── utils/             # 克制、打击面、评分、配队逻辑
│   ├── types/
│   └── App.tsx
├── src-tauri/             # Tauri Rust 工程
├── package.json
└── README.md
```

---

## npm 脚本

| 命令 | 说明 |
|------|------|
| `npm run import-data` | 从 `roco spider` CSV 生成 `public/data` |
| `npm run dev` | Vite 开发服务器 |
| `npm run build` | 前端生产构建 → `dist/` |
| `npm run tauri:dev` | Tauri 开发模式 |
| `npm run tauri:build` | 打包桌面应用 + NSIS |
| `npm run patch-icon` | 为已编译 exe 写入图标 |
| `npm run app-icon` | 生成图标并完整重编译 release |
| `npm run run:release` | 运行 release 版 exe |
| `npm run preview` | 预览 `dist` 静态站 |

---

## 数据与仓库关系

```
roco kingdom/               # 总览见根目录 README.md
├── roco spider/            # 爬虫：Wiki → CSV / 图片
├── roco calculator/        # 本仓库：导入 JSON + 桌面 UI
└── roco pvp/               # 可选：视觉 PVP，共用 JSON / 队伍格式
```

更新 Wiki 数据后：spider 爬取 → 本目录 `npm run import-data` →（可选）pvp `sync_calculator_data.py`。

---

## 开发说明

### 布局模式

- **列表 / 详情** 宽度：中间折叠钮切换（技能列表四栏布局时隐藏该钮，改在详情右上角 **紧凑 / 宽松**）
- **技能列表 + 配队** 同开：四栏等宽；详情与配队站位、选中精灵联动

### 克制图逻辑摘要

- 单选中间属性：左侧来自该属性 `chart.weak`
- 多选中间属性：左侧用 `getCombinedDefendMultiplier`（双属性时走 BWIKI 同款 weak/vulnerable 合并）
- 右侧：各选中属性 `chart.strong` 的并集

### 常见问题

**Q: 安装包 / MSI 构建失败？**  
A: 项目路径含空格时 WiX MSI 可能失败；NSIS 安装包与 `roco-calculator.exe` 通常仍可用，见 `src-tauri/target/release/`。

**Q: 精灵缺失或进化链不对？**  
A: 检查 `import_data.py` 中进化/最终形态规则，重新 `import-data`；编号不同的并列最终形态不会互相隐藏。

**Q: 浏览器里无法保存配队文件？**  
A: 完整文件读写需 Tauri 桌面版；浏览器模式会回退为下载 JSON。

---

## 参与贡献

1. Fork 本仓库（或在上级 monorepo 中针对 `roco calculator` 目录提 PR）
2. 创建功能分支：`git checkout -b feature/your-feature`
3. 提交前请执行：`npm run build`
4. 发起 Pull Request，并说明是否包含数据变更（需注明 spider / import 步骤）

欢迎提交：UI 改进、数据校验、克制/打击面算法修正、文档与 i18n。

---

## 免责声明

本软件仅供学习与交流，数据可能存在滞后或误差，请以游戏内与官方公告为准。禁止将本项目用于任何商业用途或再分发游戏资产。

---

## License

源码按仓库约定使用；游戏相关素材与数据不随本仓库授权。第三方依赖见各 package 的 LICENSE。
