# PVP 战斗 UI 模板（OpenCV 用）

## 模板是干什么的？

程序每隔不到 1 秒截一次游戏画面，用 **小块 PNG** 在画面里搜索，判断：

| 文件 | 用途 |
|------|------|
| `battle_hud.png` | 是否处于战斗界面 |
| `turn_indicator.png` | 是否轮到我方出招（满足才按 1~4 放技能） |
| `pvp_queue.png` | （可选）是否在匹配/排队 |

必须是 **几十到一百多像素宽的小图**，不是整屏截图。Wiki 攻略长图无法直接当模板用。

## 没有游戏界面怎么办？

已提供脚本，从 [Auto-rocokingdom](https://github.com/yorusacri/Auto-rocokingdom) 下载 **PVE 战斗 UI** 小图作起点（与 PVP 界面接近但不保证一致）：

```powershell
uv run python scripts/fetch_battle_templates.py
```

公测后请在 **PC PVP 战斗** 里自己截屏裁切，覆盖 `battle_hud.png`、`turn_indicator.png`。

## 技能操作

已改为键盘 **1 / 2 / 3 / 4** 对应四个技能槽，无需配置坐标。请确保游戏内快捷键与 `config/default.yaml` 中 `skill_keys` 一致。
