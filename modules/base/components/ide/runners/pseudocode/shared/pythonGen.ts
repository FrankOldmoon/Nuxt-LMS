/**
 * IR → Python 生成器（IGCSE / ALEVEL 共用）。
 * 关键语义映射：
 *  - 数组下标 1-based → Python 0-based（一维且下界为 1 时用 padding 保留下标直观）
 *  - BYREF 过程 → 返回值回传 + 调用点解包
 *  - 文件操作 → Python open/readline/write/close + EOF helper
 *  - RANDOM/RAND → random 模块
 */
import { ExprPrinter, type ExprStyle, emitBlock, type CodeEmitter } from "./codegen";
import type {
  Program,
  Stmt,
  Expr,
  BuiltinName,
  DataType,
  Param,
  CaseValue,
  ClassMember,
} from "./ir";

// ---------------- 表达式打印 ----------------

const PYTHON_STYLE: ExprStyle = {
  divIntOp: "//",
  modOp: "%",
  powOp: "**",
  concatOp: "+",
  eqOp: "==",
  neOp: "!=",
  andOp: "and",
  orOp: "or",
  notOp: "not",
  boolTrue: "True",
  boolFalse: "False",
  builtinNames: {},
  date: () => "None",
};

class PythonExprPrinter extends ExprPrinter {
  constructor(private gen: PythonGenerator) {
    super(PYTHON_STYLE);
  }

  protected builtinCall(expr: Extract<Expr, { kind: "builtinCall" }>): string {
    const e = this;
    const a = (i: number) => e.exprToString(expr.args[i]);
    switch (expr.name) {
      case "length":
        return `len(${a(0)})`;
      case "lcase":
        return `${a(0)}.lower()`;
      case "ucase":
        return `${a(0)}.upper()`;
      case "substring":
      case "mid":
        return `${a(0)}[${a(1)}-1:${a(1)}-1+${a(2)}]`;
      case "right":
        return `${a(0)}[-${a(1)}:]`;
      case "left":
        return `${a(0)}[:${a(1)}]`;
      case "round":
        return `round(${a(0)}, ${a(1)})`;
      case "random":
        this.gen.needRandom = true;
        return `random.random()`;
      case "rand":
        this.gen.needRandom = true;
        return `random.randrange(${a(0)})`;
      case "int":
        return `int(${a(0)})`;
      case "eof":
        this.gen.needEof = true;
        return `_eof(${this.gen.fileRef(expr.args[0])})`;
      default:
        return `${expr.name}(${expr.args.map((x) => e.exprToString(x)).join(", ")})`;
    }
  }
}

// ---------------- 数组下标映射 ----------------

interface ArrayInfo {
  dims: { low: number; high: number }[];
}

/** 收集顶层/局部 DECLARE 的数组信息 */
function collectArrays(stmts: Stmt[], out: Map<string, ArrayInfo>): void {
  for (const s of stmts) {
    if (s.kind === "declare" && s.type.kind === "array") {
      const dims = s.type.dims.map((d) => ({
        low: numericConst(d.low),
        high: numericConst(d.high),
      }));
      // 只有上下界都是数字时才登记，便于偏移计算
      if (dims.every((d) => d.low !== null && d.high !== null)) {
        out.set(s.name, { dims: dims as { low: number; high: number }[] });
      }
    }
    // 递归遍历子块（传入整个子 stmt 数组，而非单个 stmt）
    collectArrays(nestedStmts(s), out);
  }
}

function nestedStmts(s: Stmt): Stmt[] {
  switch (s.kind) {
    case "if":
      return s.branches.flatMap((b) => b.body ?? []);
    case "while":
    case "repeat":
    case "for":
      return s.body ?? [];
    case "proc":
      return s.fn.body ?? [];
    case "case":
      return [...s.branches.flatMap((b) => b.body ?? []), ...(s.otherwise ?? [])];
    default:
      return [];
  }
}

function numericConst(e: Expr): number | null {
  return e.kind === "number" ? e.value : null;
}

/** 标量类型的 Python 默认值 */
function scalarDefault(t: DataType): string {
  switch (t) {
    case "INTEGER": return "0";
    case "REAL": return "0.0";
    case "BOOLEAN": return "False";
    case "CHAR":
    case "STRING": return '""';
    case "DATE": return "datetime.date(1970, 1, 1)";
    default: return "None";
  }
}

/** 标量类型的输入转换包装（无转换时返回空串） */
function scalarInputCast(t: DataType | undefined): string {
  switch (t) {
    case "INTEGER": return "int(";
    case "REAL": return "float(";
    case "BOOLEAN": return "bool(";
    default: return "";
  }
}

// ---------------- 生成器 ----------------

/** 收集所有 DECLARE 的标量类型（含块内、过程参数），供 INPUT/DECLARE 生成时做类型映射 */
function collectScalarTypes(stmts: Stmt[], out: Map<string, DataType>): void {
  for (const s of stmts) {
    if (s.kind === "declare" && typeof s.type === "string") {
      out.set(s.name, s.type);
    }
    // 过程/函数的参数也登记为标量（便于函数体内 INPUT 做类型转换）
    if (s.kind === "proc") {
      for (const p of s.fn.params) {
        if (typeof p.type === "string") out.set(p.name, p.type);
      }
    }
    collectScalarTypes(nestedStmts(s), out);
  }
}

export class PythonGenerator implements CodeEmitter {
  needRandom = false;
  needEof = false;
  warnings: string[] = [];
  private arrays = new Map<string, ArrayInfo>();
  private scalarTypes = new Map<string, DataType>();
  /** BYREF 过程表：过程名 → 参数名数组 */
  private byrefProcs = new Map<string, string[]>();
  private openedFiles = new Map<string, string>();
  private fileCounter = 0;
  private expr: PythonExprPrinter;

  constructor() {
    this.expr = new PythonExprPrinter(this);
  }

  /** 生成完整 Python 源码 */
  generate(program: Program): { code: string; warnings: string[] } {
    this.arrays.clear();
    this.scalarTypes.clear();
    this.byrefProcs.clear();
    this.openedFiles.clear();
    this.fileCounter = 0;
    this.needRandom = false;
    this.needEof = false;
    this.warnings = [];

    collectArrays(program.stmts, this.arrays);
    collectScalarTypes(program.stmts, this.scalarTypes);
    this.collectByrefProcs(program.stmts);

    const body = emitBlock(this, program.stmts, 0);
    const header: string[] = [];
    if (this.needRandom) header.push("import random");
    if (this.needEof) {
      header.push(
        "def _eof(f):\n    cur = f.tell()\n    data = f.readline()\n    f.seek(cur)\n    return data == \"\""
      );
    }
    const code = [...header, ...body].filter((l) => l !== "").join("\n");
    return { code, warnings: this.warnings };
  }

  private collectByrefProcs(stmts: Stmt[]): void {
    for (const s of stmts) {
      if (s.kind === "proc") {
        const byrefs = s.fn.params.filter((p) => p.byRef).map((p) => p.name);
        if (byrefs.length > 0) this.byrefProcs.set(s.fn.name, byrefs);
      }
      this.collectByrefProcs(nestedStmts(s));
    }
  }

  /** 文件引用 → Python 文件对象变量名 */
  fileRef(file: Expr): string {
    // 字符串字面量 → 查已打开文件表
    if (file.kind === "string") {
      const key = `"${file.value}"`;
      const found = this.openedFiles.get(file.value);
      if (found) return found;
      // 未打开：视为打开同名文件
      const varName = this.allocFileVar();
      this.openedFiles.set(file.value, varName);
      return varName;
    }
    return this.exprToString(file);
  }

  private allocFileVar(): string {
    this.fileCounter++;
    return `_f${this.fileCounter}`;
  }

  exprToString(e: Expr): string {
    return this.expr.exprToString(e);
  }

  /** 数组访问：根据符号表做下标映射 */
  private arrayAccess(e: Extract<Expr, { kind: "arrayAccess" }>): string {
    const base = e.target.kind === "identifier" ? e.target.name : this.exprToString(e.target);
    const info = e.target.kind === "identifier" ? this.arrays.get(e.target.name) : undefined;
    return (
      base +
      "[" +
      e.indices
        .map((idx, n) => {
          let s = this.exprToString(idx);
          if (info && info.dims[n]) {
            const dim = info.dims[n];
            // 一维且下界为 1 → padding 保留下标；否则偏移 -low
            if (!(info.dims.length === 1 && dim.low === 1)) {
              const offset = dim.low;
              s = `(${s}) - ${offset}`;
            }
          }
          return s;
        })
        .join("][") +
      "]"
    );
  }

  stmtToLines(s: Stmt, level: number): (string | null)[] {
    const ind = (n: number) => "    ".repeat(n);
    switch (s.kind) {
      case "comment":
        return [ind(level) + "#" + s.text.replace(/^\/\/\s*/, "")];
      case "assign":
        return [ind(level) + `${this.assignTarget(s.target)} = ${this.exprToString(s.value)}`];
      case "declare": {
        if (s.type.kind === "array") {
          return [ind(level) + this.arrayInit(s.name, s.type)];
        }
        // 标量声明：按声明类型给出 Python 默认值（INTEGER→0、REAL→0.0、BOOLEAN→False 等）
        return [ind(level) + `${s.name} = ${scalarDefault(s.type)}`];
      }
      case "const":
        return [ind(level) + `${s.name} = ${this.exprToString(s.value)}`];
      case "input":
        return s.targets.map((t) => {
          const targetStr = this.assignTarget(t);
          const tname = t.kind === "identifier" ? t.name : undefined;
          const cast = scalarInputCast(this.scalarTypes.get(tname ?? ""));
          // 有类型转换包装时在 input() 外套一层转换；数组元素等非标量不转换
          return ind(level) + (cast ? `${targetStr} = ${cast}input())` : `${targetStr} = input()`);
        });
      case "output":
        return [ind(level) + `print(${s.values.map((v) => this.exprToString(v)).join(", ")})`];
      case "if": {
        const lines: string[] = [];
        s.branches.forEach((b, i) => {
          const kw = i === 0 ? "if" : b.cond ? "elif" : "else";
          const head = b.cond
            ? `${ind(level)}${kw} ${this.exprToString(b.cond)}:`
            : `${ind(level)}${kw}:`;
          lines.push(head);
          lines.push(...emitBlock(this, b.body, level + 1));
        });
        return lines;
      }
      case "case": {
        const lines: string[] = [];
        const subj = this.exprToString(s.subject);
        s.branches.forEach((b, i) => {
          const conds = b.values.map((v) => this.caseCond(subj, v)).join(" or ");
          const kw = i === 0 ? "if" : "elif";
          lines.push(`${ind(level)}${kw} ${conds}:`);
          lines.push(...emitBlock(this, b.body, level + 1));
        });
        if (s.otherwise) {
          lines.push(`${ind(level)}else:`);
          lines.push(...emitBlock(this, s.otherwise, level + 1));
        }
        return lines;
      }
      case "for": {
        const lines: string[] = [];
        const rng = this.forRange(s.variable, s.from, s.to, s.step);
        lines.push(`${ind(level)}for ${s.variable} in ${rng}:`);
        lines.push(...emitBlock(this, s.body, level + 1));
        return lines;
      }
      case "while": {
        const lines: string[] = [];
        lines.push(`${ind(level)}while ${this.exprToString(s.cond)}:`);
        lines.push(...emitBlock(this, s.body, level + 1));
        return lines;
      }
      case "repeat": {
        const lines: string[] = [];
        lines.push(`${ind(level)}while True:`);
        lines.push(...emitBlock(this, s.body, level + 1));
        lines.push(`${ind(level)}    if ${this.exprToString(s.cond)}:`);
        lines.push(`${ind(level)}        break`);
        return lines;
      }
      case "proc":
        return this.procLines(s, level);
      case "return":
        return [ind(level) + `return ${s.value ? this.exprToString(s.value) : ""}`];
      case "call":
        return [ind(level) + this.callLine(s.name, s.args)];
      case "fileOp":
        return this.fileOpLines(s, level);
      case "typeDef":
        this.warnings.push(`TYPE 定义 ${s.name} 暂不支持转换为 Python`);
        return [ind(level) + `# TYPE ${s.name}`];
      case "define": {
        const vals = s.values.map((v) => this.exprToString(v));
        return [ind(level) + `${s.name} = {${vals.join(", ")}}`];
      }
      case "classDef":
        this.warnings.push(`CLASS ${s.name} 暂不支持转换为 Python`);
        return [ind(level) + `# CLASS ${s.name}`];
      default:
        return [];
    }
  }

  private assignTarget(t: Expr): string {
    if (t.kind === "arrayAccess") return this.arrayAccess(t);
    if (t.kind === "deref") return this.exprToString(t);
    return this.exprToString(t);
  }

  private arrayInit(name: string, type: Extract<DataType, { kind: "array" }>): string {
    const info = this.arrays.get(name);
    if (info) {
      // 一维下界 1 → padding（保留下标）；否则偏移（长度 high-low+1）
      const parts = info.dims.map((d) => {
        if (d.low === 1) return d.high + 1;
        return d.high - d.low + 1;
      });
      if (parts.length === 1) {
        return `${name} = [0] * ${parts[0]}`;
      }
      // 多维
      let inner = `[0] * ${parts[parts.length - 1]}`;
      for (let i = parts.length - 2; i >= 0; i--) {
        inner = `[${inner} for _ in range(${parts[i]})]`;
      }
      return `${name} = ${inner}`;
    }
    // 未知维度：退化为空列表
    return `${name} = []`;
  }

  private forRange(v: string, from: Expr, to: Expr, step: Expr | null): string {
    const f = this.exprToString(from);
    const t = this.exprToString(to);
    if (step) {
      const sv = this.exprToString(step);
      const neg = step.kind === "unary" && step.op === "neg";
      const end = neg ? `${t} - 1` : `${t} + 1`;
      return `range(${f}, ${end}, ${sv})`;
    }
    return `range(${f}, ${t} + 1)`;
  }

  private caseCond(subj: string, v: CaseValue): string {
    if (v.kind === "range") {
      return `${subj} >= ${this.exprToString(v.low)} and ${subj} <= ${this.exprToString(v.high)}`;
    }
    return `${subj} == ${this.exprToString(v.expr)}`;
  }

  private procLines(s: Extract<Stmt, { kind: "proc" }>, level: number): (string | null)[] {
    const fn = s.fn;
    const lines: string[] = [];
    const ind = (n: number) => "    ".repeat(n);
    const params = fn.params.map((p) => this.exprToString({ kind: "identifier", name: p.name }));
    lines.push(`${ind(level)}def ${fn.name}(${params.join(", ")}):`);
    lines.push(...emitBlock(this, fn.body, level + 1));
    // BYREF 参数回传
    const byrefs = fn.params.filter((p) => p.byRef);
    if (byrefs.length > 0 && !fn.isFunction) {
      const names = byrefs.map((p) => p.name);
      lines.push(`${ind(level)}    return ${names.join(", ")}`);
    }
    return lines;
  }

  private callLine(name: string, args: Expr[]): string {
    const byrefs = this.byrefProcs.get(name);
    const argStrs = args.map((a) => this.exprToString(a));
    const call = `${name}(${argStrs.join(", ")})`;
    if (byrefs && byrefs.length > 0) {
      return `${argStrs.join(", ")} = ${call}`;
    }
    return call;
  }

  private fileOpLines(s: Extract<Stmt, { kind: "fileOp" }>, level: number): (string | null)[] {
    const ind = (n: number) => "    ".repeat(n);
    switch (s.op) {
      case "open": {
        const fname = s.file.kind === "string" ? s.file.value : this.exprToString(s.file);
        const modeMap: Record<string, string> = {
          READ: '"r"',
          WRITE: '"w"',
          APPEND: '"a"',
          RANDOM: '"r+"',
        };
        // 文件名 → 文件对象变量
        let varName = this.openedFiles.get(fname);
        if (!varName) {
          varName = this.allocFileVar();
          this.openedFiles.set(fname, varName);
        }
        const target = s.file.kind === "string" ? `"${fname}"` : this.exprToString(s.file);
        return [`${ind(level)}${varName} = open(${target}, ${modeMap[s.mode ?? "READ"]})`];
      }
      case "read": {
        const f = this.fileRef(s.file);
        const t = s.target ? this.assignTarget(s.target) : "";
        return [`${ind(level)}${t} = ${f}.readline()`];
      }
      case "write": {
        const f = this.fileRef(s.file);
        const d = s.data ? this.exprToString(s.data) : "";
        return [`${ind(level)}${f}.write(str(${d}))`];
      }
      case "close": {
        const f = this.fileRef(s.file);
        return [`${ind(level)}${f}.close()`];
      }
      case "seek": {
        const f = this.fileRef(s.file);
        const a = s.address ? this.exprToString(s.address) : "0";
        return [`${ind(level)}${f}.seek(${a})`];
      }
      case "get":
      case "put":
        this.warnings.push("GETRECORD/PUTRECORD 随机文件操作暂不支持转换为 Python");
        return [
          `${ind(level)}# ${s.op === "get" ? "GETRECORD" : "PUTRECORD"} 随机文件操作暂不支持`,
        ];
      default:
        return [];
    }
  }
}

export function irToPython(program: Program): { code: string; warnings: string[] } {
  return new PythonGenerator().generate(program);
}
