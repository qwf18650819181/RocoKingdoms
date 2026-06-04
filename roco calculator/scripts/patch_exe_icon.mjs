/**
 * 编译后用 rcedit 写入 exe 图标（规避路径含空格时 winres 嵌入失败）。
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rcedit } from "rcedit";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const icon = path.join(root, "src-tauri", "icons", "icon.ico");

const exeCandidates = [
  path.join(root, "src-tauri", "target", "release", "roco-calculator.exe"),
  path.join(root, "src-tauri", "target", "debug", "roco-calculator.exe"),
];

if (!existsSync(icon)) {
  console.error("Missing icon:", icon);
  console.error("Run: npm run app-icon");
  process.exit(1);
}

let patched = 0;
for (const exe of exeCandidates) {
  if (!existsSync(exe)) continue;
  await rcedit(exe, { icon });
  console.log("Patched icon:", exe);
  patched += 1;
}

if (patched === 0) {
  console.error("No exe found. Build first: cargo build --manifest-path src-tauri/Cargo.toml");
  process.exit(1);
}
