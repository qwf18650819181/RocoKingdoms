# Roco Spider · 洛克王国 BWIKI 数据爬虫

[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![pandas](https://img.shields.io/badge/pandas-2.x-150458)](https://pandas.pydata.org/)

从 [洛克王国世界 BWIKI](https://wiki.biligame.com/rocom/) 批量抓取精灵、技能、属性克制与图标，导出为 **CSV** 及本地图片，供 [`roco calculator`](../roco%20calculator/) 导入为离线 JSON。

> 爱好者数据采集工具，请遵守 Wiki 使用规范与访问频率，数据版权归原权利方所有。

---

## 功能

- 通过 MediaWiki **Ask API** 拉取「精灵」「技能」分类结构化字段
- 导出精灵种族值、特性、进化、技能池（默认 / 血脉 / 技能石）
- 导出属性克制表（`type_effect_chart` + `type_matchups`）
- 解析精灵蛋组等扩展表
- 可选下载精灵立绘、属性/种族值图标到 `output/images/`
- 请求限速与重试，降低对 Wiki 的压力

---

## 环境要求

- Python 3.9+
- 可访问 `wiki.biligame.com` 的网络环境

---

## 安装

```bash
cd "roco spider"
pip install -r requirements.txt
```

依赖：`requests`、`beautifulsoup4`、`pandas`。

---

## 使用

### 完整爬取（推荐）

```bash
python scraper.py
```

默认输出到 `output/csv/`，并下载图片到 `output/images/`。

### 仅导出 CSV（不下载图片）

```bash
python scraper.py --skip-images
```

### 指定输出目录

```bash
python scraper.py -o output/csv
```

---

## 输出文件

### CSV（`output/csv/`）

| 文件 | 说明 |
|------|------|
| `spirits.csv` | 精灵基础信息、种族值、特性、立绘链接等 |
| `skills.csv` | 全局技能目录（描述、效果、耗能、威力、类别） |
| `spirit_skills.csv` | 精灵 ↔ 技能关联（来源：默认/血脉/技能石） |
| `spirit_types.csv` | 精灵属性关联 |
| `spirit_egg_groups.csv` | 精灵蛋组 |
| `icons.csv` | 属性 / 种族值图标路径 |
| `type_effect_chart.csv` | 各属性视角克制分组（强/弱/抗等） |
| `type_matchups.csv` | 攻击 → 防御 非 1.0 倍率表 |

### 图片（`output/images/`）

```
output/images/
├── spirits/          # 精灵立绘
└── icons/
    ├── attributes/   # 18 属性图标
    └── stats/        # 种族值项图标
```

---

## 与下游项目的关系

```
roco spider  →  output/csv + images
       ↓
roco calculator  →  npm run import-data  →  public/data/*.json
       ↓
roco pvp  →  scripts/sync_calculator_data.py  →  data/*.json
```

更新 Wiki 后建议流程：

1. 在本目录运行 `python scraper.py`
2. 在 `roco calculator` 运行 `npm run import-data`
3. （可选）在 `roco pvp` 运行 `uv run python scripts/sync_calculator_data.py`

---

## 项目结构

```
roco spider/
├── scraper.py          # 主爬虫（Ask API + 导出）
├── requirements.txt
├── output/
│   ├── csv/            # 运行后生成
│   └── images/         # 运行后生成（可 --skip-images 跳过）
└── README.md
```

---

## 实现说明

- 数据源：`https://wiki.biligame.com/rocom/api.php`（`action=askargs`）
- 精灵阶段名称会规范为 `Ⅰ阶` / `Ⅱ阶` / `最终阶段` 等统一标签
- 无有效 **序号** 的精灵记录在导出前过滤
- 默认请求间隔约 **0.8s**，失败自动重试（最多 8 次）

---

## 常见问题

**Q: 请求 429 / 567？**  
A: 等待一段时间后重跑；勿短时间高频执行。

**Q: CSV 已有但 calculator 缺精灵？**  
A: 在 calculator 侧执行 `npm run import-data`，并查看 import 日志是否跳过脏数据。

**Q: 图片路径对不上？**  
A: 确保未使用 `--skip-images`，或 calculator 导入时会尝试从 Wiki 补拉图标。

---

## 免责声明

仅供学习与个人研究。请合理控制爬取频率，不得用于商业或再分发游戏资产。使用产生的一切后果由使用者自行承担。
