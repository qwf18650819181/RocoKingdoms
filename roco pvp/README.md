# Roco PVP · 洛克王国世界自动 PVP

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![OpenCV](https://img.shields.io/badge/OpenCV-4.x-5C3EE8)](https://opencv.org/)
[![Windows](https://img.shields.io/badge/Platform-Windows-0078D6?logo=windows)](https://www.microsoft.com/windows)

基于 **屏幕识别 + 属性克制选招 + 驱动级键盘输入** 的 PVP 战斗辅助。游戏数据与配队格式对接同仓库 [`roco calculator`](../roco%20calculator/)；精灵原始数据来自 [`roco spider`](../roco%20spider/)。

架构参考 [Auto-rocokingdom](https://github.com/yorusacri/Auto-rocokingdom)、[RocoPilot](https://github.com/Makapic/RocoPilot)。

```
截屏 → OpenCV 判断战斗/回合 → YOLO 识别敌方精灵（可选）
     → calculator JSON 克制选招 → Interception 按 1~4 出招
```

> **仅供计算机视觉与自动化技术研究。** 可能违反游戏用户协议，账号风险自负。不涉及内存修改或封包篡改。

---

## 功能概览

| 模块 | 作用 |
|------|------|
| **OpenCV 模板** | 识别是否在战斗、是否轮到我方操作 |
| **YOLO（可选）** | 框选敌方精灵，推断属性以选技能 |
| **选招引擎** | 读取队伍 JSON + 克制表，为 4 个技能槽打分 |
| **Interception** | 驱动级按键 `1`~`4`（可 `dry_run` 仅日志） |
| **配队同步** | 与 calculator「PVP 配队 → 保存队伍」JSON 格式一致 |

---

## 环境要求

- **Windows 10+**
- **Python 3.10+**
- [Interception 驱动](https://github.com/oblitum/Interception/releases/tag/v1.0.1)（正式出招需要，安装后重启）
- **管理员身份**运行（Interception 要求）
- 可选：[uv](https://github.com/astral-sh/uv) 管理依赖（推荐）

---

## 安装

```powershell
cd "d:\roco kingdom\roco pvp"

# 安装 uv（若尚未安装）
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

uv sync
uv sync --extra yolo   # 需要 YOLO 训练/推理时
uv sync --extra dev    # 运行 pytest
```

---

## 数据准备

### 1. 上游数据链

```text
roco spider  →  CSV
roco calculator  →  npm run import-data  →  public/data/*.json
```

### 2. 同步到本项目的 `data/`

```powershell
uv run python scripts/sync_calculator_data.py
```

复制：`spirits.json`、`skills.json`、`spirit_skills.json`、`type_effectiveness.json`。

也可在 `config/default.yaml` 或 `user_prefs.yaml` 中直接指向 calculator 目录：

```yaml
calculator_data_dir: "../roco calculator/public/data"
```

### 3. 队伍配置

`teams/main_team.json` 与 **calculator 导出的 PVP 队伍** 同结构（6 槽 × 每槽 `spiritId` + 4 技能名）。

- 在 calculator 中配队 → **保存队伍** → 将 JSON 复制到 `teams/`
- 或使用脚本自动推荐队伍：

```powershell
uv run python scripts/build_recommended_team.py
uv run python scripts/print_team.py
```

---

## 配置

主配置：`config/default.yaml`（可用 `user_prefs.yaml` 覆盖）

| 项 | 说明 |
|----|------|
| `window_title_keyword` | 游戏窗口标题关键字 |
| `match_threshold` | 模板匹配阈值 |
| `calculator_data_dir` | JSON 数据目录 |
| `team_file` | 队伍 JSON 路径 |
| `templates_dir` | 战斗 UI 模板图目录 |
| `input_driver` | `interception` 或 `dry_run` |
| `yolo.enabled` | 是否启用 YOLO |
| `skill_keys` | 技能槽对应按键，默认 `1`~`4` |

---

## 模板与 YOLO

### 战斗 UI 模板

1. 阅读 [`templates/pvp/README.md`](templates/pvp/README.md)
2. 截取游戏内 PVP 界面 UI 放入 `templates/pvp/`
3. 或拉取参考模板（需实测校准）：

```powershell
uv run python scripts/fetch_battle_templates.py
```

### YOLO 做什么？

OpenCV 只能识别 **固定 HUD**；YOLO 用于在画面中 **定位敌方精灵**，再结合 `spirits.json` 推断属性，才能按克制选 1~4 技能。

```powershell
uv run python yolo/export_dataset.py
# 在游戏 PVP 中截图并标注 → yolo/dataset/images/train
uv run python yolo/train.py --epochs 80
```

- `spirits.json` 仅提供 **类别名称表**（约 178 类），不能代替游戏内截图训练
- 无模型时可设 `yolo.enabled: false`，选招回退默认策略

---

## 运行

```powershell
# 列出匹配窗口
uv run roco-pvp list-windows

# 试跑（不按键，只打印决策）
uv run roco-pvp run --dry-run

# 正式运行（Interception + 管理员）
uv run roco-pvp run

# 指定窗口句柄
uv run roco-pvp run --hwnd 123456

# 测试选招逻辑（不截屏）
uv run roco-pvp test-decision --slot 0 --enemy-attr 草
```

---

## 项目结构

```
roco pvp/
├── main.py                 # 入口
├── roco_pvp/
│   ├── cli.py              # 命令行
│   ├── config.py           # 配置加载
│   ├── game_data.py        # 读取 calculator JSON
│   ├── team.py             # 队伍 JSON
│   ├── type_calc.py        # 属性倍率
│   ├── capture/            # 窗口、截屏
│   ├── vision/             # 模板匹配、YOLO
│   ├── input/              # Interception / dry_run
│   └── battle/             # 状态机、选招、主循环
├── scripts/
│   ├── sync_calculator_data.py
│   ├── build_recommended_team.py
│   ├── fetch_battle_templates.py
│   └── print_team.py
├── yolo/                   # 数据集与训练
├── templates/pvp/          # UI 模板（需自备或拉取）
├── config/default.yaml
├── teams/                  # 队伍 JSON
├── data/                   # 同步后的 JSON（可选）
└── tests/
```

---

## 开发

```powershell
uv run pytest
```

核心测试：`tests/test_type_calc.py`（属性克制计算）。

---

## 仓库内位置

本目录为 monorepo [`roco kingdom`](../README.md) 子项目之一，与 **spider**（数据源）、**calculator**（图鉴与手动配队）配合使用。

---

## 免责声明

仅供技术研究。使用可能违反游戏用户协议，账号风险自负。禁止用于商业用途或传播作弊工具。
