/**
 * 官方风格示例库双向转换测试（分模块 import 示例）。
 * 运行：node convert/verify_examples.mjs
 */
import { psToPy, pyToPs } from "./index.mjs";
import { examples as igcse } from "./examples/igcse.mjs";
import { examples as alevel } from "./examples/alevel.mjs";

let pass = 0;
let fail = 0;

function show(name, ok, extra = "") {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  " + extra : ""}`);
}

for (const [k, src] of Object.entries(igcse)) {
  try {
    const fwd = psToPy(src, "IGCSE");
    const back = pyToPs(fwd, "IGCSE");
    const issues = [
      fwd.trim() === "" ? "empty python" : "",
      back.trim() === "" ? "empty back" : "",
    ].filter(Boolean);
    show(`igcse ${k}`, issues.length === 0, issues.join(" | "));
  } catch (e) {
    show(`igcse ${k}`, false, String(e.message));
  }
}

for (const [k, src] of Object.entries(alevel)) {
  try {
    const fwd = psToPy(src, "ALEVEL");
    const back = pyToPs(fwd, "ALEVEL");
    const issues = [
      fwd.trim() === "" ? "empty python" : "",
      back.trim() === "" ? "empty back" : "",
    ].filter(Boolean);
    show(`alevel ${k}`, issues.length === 0, issues.join(" | "));
  } catch (e) {
    show(`alevel ${k}`, false, String(e.message));
  }
}

console.log(`\n===== ${pass} passed, ${fail} failed =====`);
if (fail > 0) process.exit(1);
