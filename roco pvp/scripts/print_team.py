import json
from pathlib import Path

team = json.loads(Path("teams/main_team.json").read_text(encoding="utf-8"))
data = Path("../roco calculator/public/data")
spirits = {int(s["id"]): s for s in json.loads((data / "spirits.json").read_text(encoding="utf-8"))}
catalog = json.loads((data / "skills.json").read_text(encoding="utf-8"))

for i, slot in enumerate(team["slots"], 1):
    s = spirits[slot["spiritId"]]
    sub = f"/{s['副属性']}" if s.get("副属性") else ""
    print(f"{i}. {s['名称']} | {s['主属性']}{sub} | BST {s['种族值总和']}")
    for sk in slot["skills"]:
        m = catalog.get(sk, {})
        print(f"   - {sk} ({m.get('category')}/{m.get('attr')})")
