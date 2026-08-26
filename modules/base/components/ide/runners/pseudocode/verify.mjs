/**
 * 核心双向转换测试（分模块 import 示例）。
 * 运行：node convert/verify.mjs
 */
import { psToPy, pyToPs } from "./index.mjs";
import { examples as igcse } from "./examples/igcse.mjs";
import { examples as alevel } from "./examples/alevel.mjs";
import { pythonExamples as pyToTest } from "./examples/python.mjs";

let pass = 0;
let fail = 0;

function show(name, ok, extra = "") {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  " + extra : ""}`);
}

// 伪代码 → Python → 伪代码（往返）
for (const [name, src] of Object.entries(igcse)) {
  try {
    const py = psToPy(src, "IGCSE");
    if (!py.trim()) throw new Error("空输出");
    pyToPs(py, "IGCSE");
    show(`igcse ${name}`, true);
  } catch (e) {
    show(`igcse ${name}`, false, String(e.message));
  }
}

for (const [name, src] of Object.entries(alevel)) {
  try {
    const py = psToPy(src, "ALEVEL");
    if (!py.trim()) throw new Error("空输出");
    pyToPs(py, "ALEVEL");
    show(`alevel ${name}`, true);
  } catch (e) {
    show(`alevel ${name}`, false, String(e.message));
  }
}

// Python → 伪代码
for (const [name, src] of Object.entries(pyToTest)) {
  try {
    const ig = pyToPs(src, "IGCSE");
    if (!ig.trim()) throw new Error("空输出");
    const al = pyToPs(src, "ALEVEL");
    if (!al.trim()) throw new Error("ALEVEL 空输出");
    show(`py->pseudo ${name}`, true);
  } catch (e) {
    show(`py->pseudo ${name}`, false, String(e.message));
  }
}

console.log(`\n===== ${pass} passed, ${fail} failed =====`);
if (fail > 0) process.exit(1);
