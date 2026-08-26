/**
 * 伪代码 ↔ Python 双向转换独立模块（IGCSE 0478 / ALEVEL 9618）。
 *
 * 用法（其它项目复制本目录后）：
 *   - TS：  import { psToPy, pyToPs } from "./convert";
 *   - JS：  import { psToPy, pyToPs } from "./convert/index.mjs";
 *
 *   psToPy(pscode, "IGCSE")  // 伪代码 → Python
 *   pyToPs(pycode, "IGCSE")  // Python → 伪代码
 *   dialect 可选 "IGCSE" | "ALEVEL"，默认 "IGCSE"。
 *
 * 依赖：仅 chevrotain（解析器框架）。打包产物 index.mjs 已内联，无需额外安装。
 */
import { igcseToPython, irToIgcse } from "./igcse";
import { alevelToPython, irToAlevel } from "./alevel";
import { pythonToIr } from "./shared/pythonParser";

export type Dialect = "IGCSE" | "ALEVEL";

/** 伪代码 → Python */
export function psToPy(pscode: string, dialect: Dialect = "IGCSE"): string {
  const r = dialect === "ALEVEL" ? alevelToPython(pscode) : igcseToPython(pscode);
  return r.code;
}

/** Python → 伪代码 */
export function pyToPs(pycode: string, dialect: Dialect = "IGCSE"): string {
  const program = pythonToIr(pycode);
  return dialect === "ALEVEL" ? irToAlevel(program) : irToIgcse(program);
}

/** 双向转换（伪代码 → Python → 伪代码），用于自检 */
export function roundtrip(pscode: string, dialect: Dialect = "IGCSE"): string {
  return pyToPs(psToPy(pscode, dialect), dialect);
}
