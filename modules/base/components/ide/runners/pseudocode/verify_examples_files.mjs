/**
 * 验证 examples_igcse.txt / examples_alevel.txt 中的每个语法片段
 * 能否被 psToPy 解析。运行：node convert/verify_examples_files.mjs
 */
import fs from "node:fs";
import { psToPy } from "./index.mjs";

function segments(text) {
  const lines = text.split("\n");
  const segs = [];
  let cur = [];
  for (const l of lines) {
    // 按 "// --- N. 标题 ---" 分割（跳过文件头注释）
    if (/^\s*\/\/\s*-{3,}/.test(l) && cur.length > 0 && !/^\s*\/\/\s*-{3,}\s*$/.test(cur[0])) {
      segs.push(cur.join("\n"));
      cur = [];
    }
    cur.push(l);
  }
  if (cur.join("\n").trim()) segs.push(cur.join("\n"));
  return segs;
}

function title(seg) {
  const m = seg.match(/\/\/\s*---\s*(.+?)\s*---/);
  return m ? m[1].trim() : seg.split("\n")[0].slice(0, 30);
}

let pass = 0;
let fail = 0;

function check(file, dialect, seg) {
  try {
    const r = psToPy(seg, dialect);
    const empty = !r || !r.trim();
    console.log(`${empty ? "FAIL" : "PASS"}  [${file}] ${title(seg)}${empty ? "  (empty)" : ""}`);
    if (empty) fail++;
    else pass++;
  } catch (e) {
    console.log(`FAIL  [${file}] ${title(seg)}  ${e.message}`);
    fail++;
  }
}

const ig = fs.readFileSync(new URL("./examples_igcse.txt", import.meta.url), "utf8");
const al = fs.readFileSync(new URL("./examples_alevel.txt", import.meta.url), "utf8");

for (const seg of segments(ig)) check("igcse", "IGCSE", seg);
for (const seg of segments(al)) check("alevel", "ALEVEL", seg);

console.log(`\n===== ${pass} passed, ${fail} failed =====`);
if (fail > 0) process.exit(1);
