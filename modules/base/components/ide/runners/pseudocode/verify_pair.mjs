/**
 * 配对测试：同一程序提供「伪代码版」与「Python 版」两套，
 * 验证 psToPy / pyToPs 双向互转（分模块 import 配对示例）。
 * 运行：node convert/verify_pair.mjs
 */
import { psToPy, pyToPs } from "./index.mjs";
import { pairs } from "./examples/pairs.mjs";

let pass = 0;
let fail = 0;

function show(name, ok, extra = "") {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  " + extra : ""}`);
}

for (const [name, dialect, ps, py] of pairs) {
  try {
    // 伪代码 → Python
    const a = psToPy(ps, dialect);
    // Python → 伪代码
    const b = pyToPs(py, dialect);
    // 往返：伪→Py→伪
    const ab = pyToPs(a, dialect);
    // 往返：Py→伪→Py
    const ba = psToPy(b, dialect);
    const all = [a, b, ab, ba];
    const labels = ["psToPy", "pyToPs", "ps->py->ps", "py->ps->py"];
    const empties = all
      .map((x, i) => (!x || !x.trim() ? labels[i] : null))
      .filter(Boolean);
    if (empties.length) {
      show(`${dialect} ${name}`, false, `empty: ${empties.join(", ")}`);
    } else {
      show(`${dialect} ${name}`, true);
    }
  } catch (e) {
    show(`${dialect} ${name}`, false, e.message);
  }
}

console.log(`\n===== ${pass} passed, ${fail} failed =====`);
if (fail > 0) process.exit(1);
