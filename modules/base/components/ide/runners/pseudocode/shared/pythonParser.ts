/**
 * Python 子集 parser：Python → IR（供反向转换 Python → 伪代码使用）。
 *
 * 本解析器针对 pythonGen 生成的确定性 Python 子集：
 *  - 语句：赋值 / 声明(None) / 数组初始化([0]*n) / INPUT=input() / OUTPUT=print /
 *    IF/ELIF/ELSE / WHILE / FOR range / REPEAT(while True + if cond: break) /
 *    def 过程函数 / return / 文件操作(open/readline/write/close/seek) /
 *    内置函数 len/round/int/random/_eof/str.lower/upper/切片
 *  - 下标偏移：数组 1-based → 0-based 的 `(i) - 1`、`x-1:x-1+y` 切片反向还原
 *
 * 解析产物为方言无关的 IR，再由 IGCSE / ALEVEL printer 输出伪代码。
 */
import type {
  Program,
  Stmt,
  Expr,
  DataType,
  Param,
  BinaryOp,
  BuiltinName,
} from "./ir";

// ================= 词法 =================

type Tok =
  | { t: "num"; v: number }
  | { t: "str"; v: string }
  | { t: "id"; v: string }
  | { t: "op"; v: string }; // 运算符/标点（= == != < <= > >= + - * / // % ** ( ) [ ] , : .）

const TOKEN_RE =
  /(\d+(?:\.\d+)?)|("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')|([A-Za-z_]\w*)|(\*\*|\/\/|==|!=|<=|>=|[=<>+\-*/%()\[\],:.])/g;

const KEYWORDS = new Set([
  "if", "elif", "else", "while", "for", "in", "range", "def", "return",
  "import", "and", "or", "not", "True", "False", "None", "break", "input",
  "print", "open",
]);

function tokenize(text: string): Tok[] {
  const toks: Tok[] = [];
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(text)) !== null) {
    if (m[1] !== undefined) {
      toks.push({ t: "num", v: parseFloat(m[1]) });
    } else if (m[2] !== undefined) {
      toks.push({ t: "str", v: unescapeStr(m[2]) });
    } else if (m[3] !== undefined) {
      toks.push({ t: "id", v: m[3] });
    } else if (m[4] !== undefined) {
      toks.push({ t: "op", v: m[4] });
    }
  }
  return toks;
}

function unescapeStr(s: string): string {
  const inner = s.slice(1, -1);
  return inner.replace(/\\(.)/g, "$1");
}

// ================= 表达式解析（递归下降） =================

class ExprCursor {
  constructor(private toks: Tok[]) {}
  pos = 0;
  peek(): Tok | undefined {
    return this.toks[this.pos];
  }
  next(): Tok | undefined {
    return this.toks[this.pos++];
  }
  isOp(v: string): boolean {
    const t = this.peek();
    return t !== undefined && t.t === "op" && t.v === v;
  }
  isKw(v: string): boolean {
    const t = this.peek();
    return t !== undefined && t.t === "id" && t.v === v;
  }
  expectOp(v: string): void {
    if (!this.isOp(v)) throw new Error(`期望 ${v}`);
    this.pos++;
  }
  expectId(): string {
    const t = this.peek();
    if (t === undefined || t.t !== "id") throw new Error("期望标识符");
    this.pos++;
    return t.v;
  }
}

function parseExprText(text: string): Expr {
  const cur = new ExprCursor(tokenize(text.trim()));
  const e = parseExpr(cur);
  if (cur.pos !== cur.toks.length) {
    throw new Error(`表达式多余内容: ${text}`);
  }
  return e;
}

function parseExpr(cur: ExprCursor): Expr {
  return parseOr(cur);
}

function parseOr(cur: ExprCursor): Expr {
  let left = parseAnd(cur);
  while (cur.isKw("or")) {
    cur.pos++;
    const right = parseAnd(cur);
    left = { kind: "binary", op: "or", left, right };
  }
  return left;
}

function parseAnd(cur: ExprCursor): Expr {
  let left = parseNot(cur);
  while (cur.isKw("and")) {
    cur.pos++;
    const right = parseNot(cur);
    left = { kind: "binary", op: "and", left, right };
  }
  return left;
}

function parseNot(cur: ExprCursor): Expr {
  if (cur.isKw("not")) {
    cur.pos++;
    return { kind: "unary", op: "not", operand: parseNot(cur) };
  }
  return parseCmp(cur);
}

const CMP_OPS: Record<string, BinaryOp> = {
  "==": "eq", "!=": "ne", "<": "lt", "<=": "le", ">": "gt", ">=": "ge",
};

function parseCmp(cur: ExprCursor): Expr {
  let left = parseAdd(cur);
  for (;;) {
    const t = cur.peek();
    if (t && t.t === "op" && CMP_OPS[t.v]) {
      cur.pos++;
      const right = parseAdd(cur);
      left = { kind: "binary", op: CMP_OPS[t.v], left, right };
    } else {
      return left;
    }
  }
}

function parseAdd(cur: ExprCursor): Expr {
  let left = parseMul(cur);
  for (;;) {
    const t = cur.peek();
    if (t && t.t === "op" && (t.v === "+" || t.v === "-")) {
      cur.pos++;
      const right = parseMul(cur);
      const op: BinaryOp = t.v === "+" ? "add" : "sub";
      // `+` 用于字符串拼接时还原为 concat
      if (t.v === "+" && (isStringish(left) || isStringish(right))) {
        left = { kind: "concat", left, right };
      } else {
        left = { kind: "binary", op, left, right };
      }
    } else {
      return left;
    }
  }
}

function isStringish(e: Expr): boolean {
  return e.kind === "string" || e.kind === "char";
}

function parseMul(cur: ExprCursor): Expr {
  let left = parseUnary(cur);
  for (;;) {
    const t = cur.peek();
    if (t && t.t === "op" && ["*", "/", "//", "%"].includes(t.v)) {
      cur.pos++;
      const right = parseUnary(cur);
      const op: BinaryOp =
        t.v === "*" ? "mul" : t.v === "/" ? "div" : t.v === "//" ? "divInt" : "mod";
      left = { kind: "binary", op, left, right };
    } else {
      return left;
    }
  }
}

function parseUnary(cur: ExprCursor): Expr {
  const t = cur.peek();
  if (t && t.t === "op" && t.v === "-") {
    cur.pos++;
    return { kind: "unary", op: "neg", operand: parseUnary(cur) };
  }
  if (t && t.t === "op" && t.v === "+") {
    cur.pos++;
    return parseUnary(cur);
  }
  return parsePower(cur);
}

function parsePower(cur: ExprCursor): Expr {
  let left = parsePostfix(cur);
  while (cur.isOp("**")) {
    cur.pos++;
    const right = parseUnary(cur);
    left = { kind: "binary", op: "pow", left, right };
  }
  return left;
}

function parsePostfix(cur: ExprCursor): Expr {
  let node = parseAtom(cur);
  for (;;) {
    if (cur.isOp("(")) {
      // 调用
      cur.pos++;
      const args: Expr[] = [];
      if (!cur.isOp(")")) {
        args.push(parseExpr(cur));
        while (cur.isOp(",")) {
          cur.pos++;
          args.push(parseExpr(cur));
        }
      }
      cur.expectOp(")");
      node = applyCall(node, args);
    } else if (cur.isOp("[")) {
      cur.pos++;
      const sub = parseSlice(cur);
      cur.expectOp("]");
      node = applySubscript(node, sub);
    } else if (cur.isOp(".")) {
      cur.pos++;
      const member = cur.expectId();
      if (cur.isOp("(")) {
        cur.pos++;
        const args: Expr[] = [];
        if (!cur.isOp(")")) {
          args.push(parseExpr(cur));
          while (cur.isOp(",")) {
            cur.pos++;
            args.push(parseExpr(cur));
          }
        }
        cur.expectOp(")");
        node = applyMethod(node, member, args);
      } else {
        node = { kind: "memberAccess", target: node, member };
      }
    } else {
      return node;
    }
  }
}

function parseAtom(cur: ExprCursor): Expr {
  const t = cur.next();
  if (t === undefined) throw new Error("表达式为空");
  if (t.t === "num") return { kind: "number", value: t.v };
  if (t.t === "str") return { kind: "string", value: t.v };
  if (t.t === "id") {
    if (t.v === "True") return { kind: "boolean", value: true };
    if (t.v === "False") return { kind: "boolean", value: false };
    if (t.v === "None") return { kind: "identifier", name: "None" };
    return { kind: "identifier", name: t.v };
  }
  // 括号表达式（如 (Index1) - 1）
  if (t.t === "op" && t.v === "(") {
    const inner = parseExpr(cur);
    cur.expectOp(")");
    return inner;
  }
  throw new Error(`意外的 token: ${t.v}`);
}

/** 函数调用 → builtinCall / call */
function applyCall(target: Expr, args: Expr[]): Expr {
  if (target.kind === "identifier") {
    const name = target.name;
    const builtin = PY_BUILTIN[name];
    if (builtin) return { kind: "builtinCall", name: builtin, args };
    return { kind: "call", name, args };
  }
  throw new Error("非法的函数调用");
}

const PY_BUILTIN: Record<string, BuiltinName> = {
  len: "length",
  round: "round",
  int: "int",
  _eof: "eof",
};

/** 方法调用 → lower/upper/random 等 */
function applyMethod(target: Expr, member: string, args: Expr[]): Expr {
  if (target.kind === "identifier" && target.name === "random") {
    if (member === "random") return { kind: "builtinCall", name: "random", args };
    if (member === "randrange") return { kind: "builtinCall", name: "rand", args };
  }
  if (member === "lower" && args.length === 0) {
    return { kind: "builtinCall", name: "lcase", args: [target] };
  }
  if (member === "upper" && args.length === 0) {
    return { kind: "builtinCall", name: "ucase", args: [target] };
  }
  return { kind: "objectCall", target, method: member, args };
}

/** 下标 / 切片 → 数组访问 / 子串函数 */
function applySubscript(target: Expr, sub: Expr | { start: Expr | null; end: Expr | null }): Expr {
  if (Array.isArray(sub)) {
    return { kind: "arrayAccess", target, indices: sub as Expr[] };
  }
  if (sub && typeof sub === "object" && "start" in sub) {
    return sliceToExpr(target, sub.start, sub.end);
  }
  return { kind: "arrayAccess", target, indices: [sub as Expr] };
}

/** 解析下标（可能是 a,b 多维，或 a:b 切片） */
function parseSlice(cur: ExprCursor): Expr[] | { start: Expr | null; end: Expr | null } {
  // 切片判定：顶层出现冒号
  if (containsColon(cur)) {
    let start: Expr | null = null;
    let end: Expr | null = null;
    if (!cur.isOp(":")) start = parseExpr(cur);
    cur.expectOp(":");
    if (!cur.isOp("]")) end = parseExpr(cur);
    return { start, end };
  }
  const items: Expr[] = [];
  items.push(parseExpr(cur));
  while (cur.isOp(",")) {
    cur.pos++;
    items.push(parseExpr(cur));
  }
  return items;
}

/** 判断当前位置到 ] 之间是否含顶层冒号（切片） */
function containsColon(cur: ExprCursor): boolean {
  let depth = 0;
  for (let i = cur.pos; i < cur.toks.length; i++) {
    const t = cur.toks[i];
    if (t.t === "op" && (t.v === "(" || t.v === "[")) depth++;
    else if (t.t === "op" && (t.v === ")" || t.v === "]")) {
      if (depth === 0) return false; // 到 ] 结束
      depth--;
    } else if (t.t === "op" && t.v === ":" && depth === 0) return true;
  }
  return false;
}

/** 切片 → substring / left / right */
function sliceToExpr(
  base: Expr,
  start: Expr | null,
  end: Expr | null
): Expr {
  if (start !== null && end !== null) {
    // 模式 x-1 : x-1+y → SUBSTRING(base, x, y)
    const s = stripMinusOne(start);
    if (s && end.kind === "binary" && end.op === "add" && sameExpr(start, end.left)) {
      return { kind: "builtinCall", name: "substring", args: [base, s, end.right] };
    }
    // 其他双边界切片无法还原，降级为单边界处理
  }
  if (start === null && end !== null) {
    // [:n] → LEFT(base, n)
    return { kind: "builtinCall", name: "left", args: [base, end] };
  }
  if (start !== null && end === null) {
    // [-n:] → RIGHT(base, n)
    if (start.kind === "unary" && start.op === "neg") {
      return { kind: "builtinCall", name: "right", args: [base, start.operand] };
    }
  }
  // 兜底：视为数组访问
  const idx = end ?? start;
  return { kind: "arrayAccess", target: base, indices: [idx as Expr] };
}

/** x-1 → x */
function stripMinusOne(e: Expr): Expr | null {
  if (e.kind === "binary" && e.op === "sub" && isOne(e.right)) return e.left;
  return null;
}

function isOne(e: Expr): boolean {
  return e.kind === "number" && e.value === 1;
}

function sameExpr(a: Expr, b: Expr): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ================= 语句解析 =================

/** 语句解析结果（header 由块构建器处理） */
type PyStmt =
  | { kind: "stmt"; stmt: Stmt }
  | { kind: "header"; header: string } // 块头行文本（不含尾随冒号）
  | { kind: "ignore" } // import / _eof helper 等跳过
  | { kind: "break" }
  | { kind: "returnTuple"; names: string[] }; // 过程 BYREF 的多值 return

/** 数组初始化信息（声明还原用） */
interface ArrayDimsInfo {
  dims: { size: number }[];
}

function parseStmtLine(text: string, fileVars: Map<string, string>): PyStmt {
  const trimmed = text.trim();
  if (trimmed === "") return { kind: "ignore" };
  if (trimmed.startsWith("#")) {
    return { kind: "stmt", stmt: { kind: "comment", text: trimmed } };
  }
  // 块头：if/elif/else/while/for/def 以冒号结尾
  if (/^(if|elif|else|while|for|def)\b/.test(trimmed) && trimmed.endsWith(":")) {
    return { kind: "header", header: trimmed.slice(0, -1).trim() };
  }
  if (trimmed === "break") {
    // 用特殊 call 表示 break，供 REPEAT 检测识别
    return { kind: "stmt", stmt: { kind: "call", name: "break", args: [] } };
  }
  if (/^import\b/.test(trimmed)) return { kind: "ignore" };

  // 语句主体（token 化）
  const toks = tokenize(trimmed);

  // return ...
  if (toks.length > 0 && toks[0].t === "id" && toks[0].v === "return") {
    const cur = new ExprCursor(toks);
    cur.pos = 1;
    if (cur.pos >= toks.length) {
      return { kind: "stmt", stmt: { kind: "return", value: null } };
    }
    // 多值 return（BYREF 过程回传）：a, b
    const names: string[] = [];
    let isTuple = false;
    while (cur.pos < toks.length) {
      const t = cur.peek();
      if (t && t.t === "id") {
        names.push(t.v);
        cur.pos++;
        if (cur.isOp(",")) {
          cur.pos++;
          isTuple = true;
        } else {
          break;
        }
      } else {
        isTuple = false;
        break;
      }
    }
    if (isTuple) {
      return { kind: "returnTuple", names };
    }
    const cur2 = new ExprCursor(toks);
    cur2.pos = 1;
    const value = parseExpr(cur2);
    return { kind: "stmt", stmt: { kind: "return", value } };
  }

  // print(...) → OUTPUT
  if (toks.length >= 2 && toks[0].t === "id" && toks[0].v === "print" && toks[1].t === "op" && toks[1].v === "(") {
    const cur = new ExprCursor(toks);
    cur.pos = 2;
    const values: Expr[] = [];
    if (!cur.isOp(")")) {
      values.push(parseExpr(cur));
      while (cur.isOp(",")) {
        cur.pos++;
        values.push(parseExpr(cur));
      }
    }
    cur.expectOp(")");
    return { kind: "stmt", stmt: { kind: "output", values } };
  }

  // 形如 var = ... 的赋值类
  const eqIdx = findTopLevelOp(toks, "=");
  if (eqIdx >= 1) {
    const lhsToks = toks.slice(0, eqIdx);
    const rhsToks = toks.slice(eqIdx + 1);
    // 元组 lhs：a, b = proc(...) → BYREF 过程调用
    if (findTopLevelOp(lhsToks, ",") >= 0) {
      const cur = new ExprCursor(rhsToks);
      const value = parseExpr(cur);
      if (value.kind === "call") {
        return { kind: "stmt", stmt: { kind: "call", name: value.name, args: value.args } };
      }
      throw new Error("多值赋值的右侧必须是过程调用");
    }
    const lhs = tokenizeStmtLhs(lhsToks);
    return parseAssignment(lhs, rhsToks, trimmed, fileVars);
  }

  // 语句表达式：过程调用 / 文件操作（f.write/f.close/f.seek）/ 函数调用
  return parseExprStmt(toks, fileVars);
}

/** 解析 lhs 为可赋值目标（标识符或数组访问） */
function tokenizeStmtLhs(lhsToks: Tok[]): Expr {
  const cur = new ExprCursor(lhsToks);
  const node = parsePostfix(cur);
  if (cur.pos !== cur.toks.length) throw new Error("非法的赋值目标");
  return node;
}

/** 赋值右侧解析：区分 input / 数组初始化 / open / readline / 普通表达式 */
function parseAssignment(
  lhs: Expr,
  rhs: Tok[],
  raw: string,
  fileVars: Map<string, string>
): PyStmt {
  // x = input()
  if (rhs.length === 3 && rhs[0].t === "id" && rhs[0].v === "input" && rhs[1].t === "op" && rhs[1].v === "(" && rhs[2].t === "op" && rhs[2].v === ")") {
    return { kind: "stmt", stmt: { kind: "input", targets: [lhs] } };
  }
  // x = None → DECLARE
  if (rhs.length === 1 && rhs[0].t === "id" && rhs[0].v === "None") {
    if (lhs.kind === "identifier") {
      return { kind: "stmt", stmt: { kind: "declare", name: lhs.name, type: "STRING" } };
    }
    throw new Error("DECLARE 目标必须是标识符");
  }
  // x = [0] * n 或 x = [[0] * n for _ in range(m)] → 数组声明
  const arrInfo = tryParseArrayInit(rhs);
  if (arrInfo && lhs.kind === "identifier") {
    const dims = arrInfo.dims.map((d) => ({
      low: { kind: "number", value: 1 } as Expr,
      high: { kind: "number", value: d.size } as Expr,
    }));
    return {
      kind: "stmt",
      stmt: {
        kind: "declare",
        name: lhs.name,
        type: { kind: "array", dims, elem: "INTEGER" },
      },
    };
  }
  // x = open("f", "r") → OPENFILE
  if (rhs.length >= 4 && rhs[0].t === "id" && rhs[0].v === "open") {
    const cur = new ExprCursor(rhs);
    const call = parseExpr(cur) as Extract<Expr, { kind: "call" }>;
    const fname = call.args[0];
    const mode = call.args[1];
    let modeStr: "READ" | "WRITE" | "APPEND" | "RANDOM" = "READ";
    if (mode && mode.kind === "string") {
      const m = mode.value.toLowerCase();
      if (m === "w") modeStr = "WRITE";
      else if (m === "a") modeStr = "APPEND";
      else if (m === "r+") modeStr = "RANDOM";
    }
    if (lhs.kind === "identifier") {
      const fileExpr = fname.kind === "string" ? fname : (fname as Expr);
      if (fileExpr.kind === "string") fileVars.set(lhs.name, fileExpr.value);
      return {
        kind: "stmt",
        stmt: { kind: "fileOp", op: "open", file: fileExpr, mode: modeStr },
      };
    }
  }
  // x = f.readline() → READFILE
  if (
    rhs.length >= 4 &&
    rhs[0].t === "id" &&
    rhs[1].t === "op" && rhs[1].v === "." &&
    rhs[2].t === "id" && rhs[2].v === "readline"
  ) {
    return {
      kind: "stmt",
      stmt: { kind: "fileOp", op: "read", file: fileExprOf(rhs[0].v, fileVars), target: lhs },
    };
  }
  // 普通赋值
  const cur = new ExprCursor(rhs);
  const value = parseExpr(cur);
  if (cur.pos !== cur.toks.length) throw new Error(`表达式多余内容: ${raw}`);
  return { kind: "stmt", stmt: { kind: "assign", target: lhs, value } };
}

/** 识别 [0] * n / [[0] * n for _ in range(m)]（token 重建文本含空格，正则需容忍） */
function tryParseArrayInit(rhs: Tok[]): ArrayDimsInfo | null {
  const s = rhs.map((t) => (t.t === "id" ? t.v : t.t === "num" ? String(t.v) : t.v)).join(" ");
  // 二维/多维：[[...] for _ in range(N)]（内层 [0]*n 的 ] 在 for 前，外层以 ] 结尾）
  const outer = s.match(/^\[(.+?)\s*for\s+_\s+in\s+range\s*\(\s*(\d+)\s*\)\s*\]$/);
  if (outer) {
    const inner = tryParseArrayInit(tokenize(outer[1]));
    if (inner) {
      return { dims: [{ size: parseInt(outer[2], 10) }, ...inner.dims] };
    }
  }
  const single = s.match(/^\[\s*0\s*\]\s*\*\s*(\d+)$/);
  if (single) return { dims: [{ size: parseInt(single[1], 10) }] };
  return null;
}

/** 语句级表达式：过程调用 / 文件操作 */
function parseExprStmt(toks: Tok[], fileVars: Map<string, string>): PyStmt {
  // f.write(...) / f.close() / f.seek(...) 文件操作
  const dotIdx = findTopLevelOp(toks, ".");
  if (dotIdx > 0 && toks[dotIdx - 1].t === "id" && toks[dotIdx + 1] && toks[dotIdx + 1].t === "id") {
    const fileVar = toks[dotIdx - 1].v;
    const member = toks[dotIdx + 1].v;
    if (["write", "close", "seek", "readline"].includes(member)) {
      const cur = new ExprCursor(toks);
      const call = parseExpr(cur) as Extract<Expr, { kind: "objectCall" }>;
      const file = fileExprOf(fileVar, fileVars);
      if (member === "write") {
        return { kind: "stmt", stmt: { kind: "fileOp", op: "write", file, data: call.args[0] } };
      }
      if (member === "close") {
        return { kind: "stmt", stmt: { kind: "fileOp", op: "close", file } };
      }
      if (member === "seek") {
        return { kind: "stmt", stmt: { kind: "fileOp", op: "seek", file, address: call.args[0] } };
      }
    }
  }
  // 普通表达式语句：过程调用 / 函数调用
  const cur = new ExprCursor(toks);
  const expr = parseExpr(cur);
  if (cur.pos !== cur.toks.length) throw new Error("非法的语句");
  if (expr.kind === "call") {
    return { kind: "stmt", stmt: { kind: "call", name: expr.name, args: expr.args } };
  }
  // x, y = proc(...) BYREF 回传
  if (expr.kind === "identifier") {
    throw new Error(`非法的语句: ${toks.map((t) => t.v).join("")}`);
  }
  throw new Error("非法的语句表达式");
}

function fileExprOf(fileVar: string, fileVars: Map<string, string>): Expr {
  const fname = fileVars.get(fileVar);
  if (fname !== undefined) return { kind: "string", value: fname };
  return { kind: "identifier", name: fileVar };
}

/** 找到顶层（不在括号内）的指定运算符索引 */
function findTopLevelOp(toks: Tok[], op: string): number {
  let depth = 0;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.t === "op" && (t.v === "(" || t.v === "[")) depth++;
    else if (t.t === "op" && (t.v === ")" || t.v === "]")) depth--;
    else if (t.t === "op" && t.v === op && depth === 0) return i;
  }
  return -1;
}

// ================= 块构建（缩进） =================

interface PyLine {
  indent: number;
  text: string; // 去缩进原文
  lineNo: number;
}

interface PyNode {
  kind: "if" | "while" | "for" | "def";
  header: string; // 块头文本（无冒号）
  indent: number;
  body: Array<PyNode | PyLine | { kind: "elif"; header: string; indent: number; body: Array<PyNode | PyLine> }>;
}

function splitLines(source: string): PyLine[] {
  const out: PyLine[] = [];
  source.split("\n").forEach((raw, i) => {
    const trimmed = raw.replace(/\t/g, "    ");
    const m = trimmed.match(/^( *)(.*)$/);
    if (!m) return;
    const indent = m[1].length;
    const text = m[2];
    if (text.trim() === "") return;
    out.push({ indent, text: text.trimEnd(), lineNo: i + 1 });
  });
  return out;
}

function buildNodes(lines: PyLine[], start: number, minIndent: number): { nodes: Array<PyNode | PyLine>; next: number } {
  const nodes: Array<PyNode | PyLine> = [];
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    if (line.indent < minIndent) break;
    if (line.indent > minIndent) {
      // 缩进异常：并入上一层（容错）
      i++;
      continue;
    }
    const header = /^(if|elif|else|while|for|def)\b/.test(line.text) && line.text.trim().endsWith(":")
      ? line.text.trim().slice(0, -1).trim()
      : null;
    if (header !== null) {
      // body 范围：缩进大于块头缩进的行
      const headIndent = line.indent;
      let j = i + 1;
      while (j < lines.length && lines[j].indent > headIndent) j++;
      // body 递归的最小缩进用实际首行缩进（Python 惯例为块头缩进 + 4），
      // 而非 minIndent + 1，否则 4 空格缩进的 body 会被误判为“缩进异常”而跳过。
      const bodyMinIndent = j > i + 1 ? lines[i + 1].indent : headIndent + 1;
      const { nodes: body } = buildNodes(lines, i + 1, bodyMinIndent);
      i = j;
      const kind = /^if\b/.test(header)
        ? "if"
        : /^elif\b/.test(header)
          ? "elif"
          : /^else\b/.test(header)
            ? "else"
            : /^while\b/.test(header)
              ? "while"
              : /^for\b/.test(header)
                ? "for"
                : "def";
      if (kind === "if") {
        nodes.push({ kind: "if", header, indent: minIndent, body });
      } else if (kind === "elif" || kind === "else") {
        // 追加到上一个 if 链（转换为 elif 标记，由 IR 阶段合并）
        nodes.push({ kind: "elif", header, indent: minIndent, body });
      } else {
        nodes.push({ kind, header, indent: minIndent, body });
      }
    } else {
      nodes.push(line);
      i++;
    }
  }
  return { nodes, next: i };
}

// ================= 块 → IR =================

type PyBlock = PyNode | PyLine;

function stmtsOf(nodes: PyBlock[], fileVars: Map<string, string>, warnings: string[]): Stmt[] {
  const out: Stmt[] = [];
  let i = 0;
  while (i < nodes.length) {
    const n = nodes[i];
    if ("indent" in n && !("body" in n)) {
      // 普通行
      const r = parseStmtLine(n.text, fileVars);
      if (r.kind === "stmt") out.push(r.stmt);
      else if (r.kind === "returnTuple") {
        // 顶层 returnTuple 非法
        warnings.push(`第 ${n.lineNo} 行: 意外的多值 return`);
      }
      i++;
      continue;
    }
    if (n.kind === "elif") {
      warnings.push(`第 ${n.lineNo} 行: ELIF 缺少 IF`);
      i++;
      continue;
    }
    // 块节点
    const node = n as PyNode;
    if (node.kind === "if") {
      // 合并 elif/else 链
      const branches: { cond: Expr | null; body: Stmt[] }[] = [];
      let cur: { cond: Expr | null; body: Stmt[] } | null = null;
      let k = i;
      while (k < nodes.length && (nodes[k] as PyNode).kind === "if") {
        const ifNode = nodes[k] as PyNode;
        const cond = parseHeaderCond(ifNode.header);
        cur = { cond, body: stmtsOf(ifNode.body, fileVars, warnings) };
        branches.push(cur);
        k++;
        // 后续 elif / else
        while (k < nodes.length && (nodes[k] as PyNode).kind === "elif") {
          const el = nodes[k] as PyNode;
          const condText = /^else\b/.test(el.header) ? null : parseHeaderCond(el.header);
          cur = { cond: condText, body: stmtsOf(el.body, fileVars, warnings) };
          branches.push(cur);
          k++;
        }
        break;
      }
      out.push({ kind: "if", branches });
      i = k;
      continue;
    }
    if (node.kind === "while") {
      const cond = parseHeaderCond(node.header);
      const body = stmtsOf(node.body, fileVars, warnings);
      // while True: ... if cond: break → REPEAT
      if (cond.kind === "boolean" && cond.value === true) {
        const last = body[body.length - 1];
        if (last && last.kind === "if" && last.branches.length === 1 && last.branches[0].cond !== null) {
          const br = last.branches[0];
          if (br.body.length === 1 && br.body[0].kind === "call" && br.body[0].name === "break") {
            out.push({ kind: "repeat", cond: br.cond, body: body.slice(0, -1) });
            i++;
            continue;
          }
        }
      }
      out.push({ kind: "while", cond, body });
      i++;
      continue;
    }
    if (node.kind === "for") {
      const f = parseForHeader(node.header);
      out.push({ kind: "for", variable: f.variable, from: f.from, to: f.to, step: f.step, body: stmtsOf(node.body, fileVars, warnings) });
      i++;
      continue;
    }
    if (node.kind === "def") {
      // 跳过 _eof 辅助函数（EOF 判断 helper）
      if (/^def\s+_eof\b/.test(node.header)) {
        i++;
        continue;
      }
      out.push(procFromDef(node, fileVars, warnings));
      i++;
      continue;
    }
    i++;
  }
  return out;
}

function parseHeaderCond(header: string): Expr {
  const m = header.match(/^(if|elif|while)\s+(.*)$/);
  if (!m) throw new Error(`非法的块头: ${header}`);
  return parseExprText(m[2]);
}

function parseForHeader(header: string): { variable: string; from: Expr; to: Expr; step: Expr | null } {
  const m = header.match(/^for\s+([A-Za-z_]\w*)\s+in\s+range\s*\((.*)\)$/);
  if (!m) throw new Error(`非法的 FOR 头: ${header}`);
  const variable = m[1];
  const args = splitTopLevelArgs(m[2]);
  const exprArgs = args.map((a) => parseExprText(a.trim()));
  if (exprArgs.length === 2) {
    // range(f, t+1) → to = t
    return { variable, from: exprArgs[0], to: minusOne(exprArgs[1]), step: null };
  }
  if (exprArgs.length === 3) {
    const step = exprArgs[2];
    // 负步长 range(f, t-1, -s) → to = t, step = s
    if (step.kind === "unary" && step.op === "neg") {
      return { variable, from: exprArgs[0], to: plusOne(exprArgs[1]), step: step.operand };
    }
    return { variable, from: exprArgs[0], to: minusOne(exprArgs[1]), step };
  }
  throw new Error(`非法的 range 参数: ${m[2]}`);
}

function minusOne(e: Expr): Expr {
  if (e.kind === "binary" && e.op === "add" && isOne(e.right)) return e.left;
  if (e.kind === "number") return { kind: "number", value: e.value - 1 };
  return { kind: "binary", op: "sub", left: e, right: { kind: "number", value: 1 } };
}

function plusOne(e: Expr): Expr {
  if (e.kind === "binary" && e.op === "sub" && isOne(e.right)) return e.left;
  if (e.kind === "number") return { kind: "number", value: e.value + 1 };
  return { kind: "binary", op: "add", left: e, right: { kind: "number", value: 1 } };
}

function splitTopLevelArgs(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of text) {
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    if (ch === "," && depth === 0) {
      parts.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim() !== "") parts.push(cur);
  return parts;
}

function procFromDef(node: PyNode, fileVars: Map<string, string>, warnings: string[]): Stmt {
  const m = node.header.match(/^def\s+([A-Za-z_]\w*)\s*\((.*)\)$/);
  if (!m) throw new Error(`非法的 def: ${node.header}`);
  const name = m[1];
  const params: Param[] = splitTopLevelArgs(m[2])
    .map((s) => s.trim())
    .filter((s) => s !== "")
    .map((s) => ({ name: s, type: "INTEGER" as DataType, byRef: false }));
  // 末尾多值 return → BYREF 参数回传（先剥离再解析 body）
  const trailingReturn = trailingReturnTuple(node.body);
  const bodyNodes = trailingReturn ? node.body.slice(0, -1) : node.body;
  if (trailingReturn) {
    for (const p of params) {
      if (trailingReturn.includes(p.name)) p.byRef = true;
    }
  }
  const body = stmtsOf(bodyNodes, fileVars, warnings);
  return {
    kind: "proc",
    fn: { name, params, isFunction: hasReturn(body), returnType: "INTEGER", body },
  };
}

/** 检测块体末尾是否是多值 return 行（BYREF 过程回传），返回参数名列表或 null */
function trailingReturnTuple(body: PyBlock[]): string[] | null {
  const last = body[body.length - 1];
  if (!last || "body" in last) return null;
  const line = last as PyLine;
  const toks = tokenize(line.text.trim());
  if (toks.length < 4 || toks[0].t !== "id" || toks[0].v !== "return") return null;
  let allIds = true;
  for (let i = 1; i < toks.length; i++) {
    const t = toks[i];
    if (!(t.t === "id" || (t.t === "op" && t.v === ","))) {
      allIds = false;
      break;
    }
  }
  if (!allIds) return null;
  // 至少包含一个逗号才视为多值 return
  if (!toks.some((t) => t.t === "op" && t.v === ",")) return null;
  return toks.filter((t): t is Extract<Tok, { t: "id" }> => t.t === "id").map((t) => t.v);
}

function hasReturn(body: Stmt[]): boolean {
  for (const s of body) {
    if (s.kind === "return" && s.value !== null) return true;
    if (s.kind === "if") {
      for (const b of s.branches) if (hasReturn(b.body)) return true;
    }
    if (s.kind === "while" || s.kind === "repeat" || s.kind === "for") {
      if (hasReturn(s.body)) return true;
    }
  }
  return false;
}

// ================= 入口 =================

export function pythonToIr(source: string): Program {
  const lines = splitLines(source);
  const { nodes } = buildNodes(lines, 0, 0);
  const fileVars = new Map<string, string>();
  const warnings: string[] = [];
  const stmts: Stmt[] = [];
  try {
    stmts.push(...stmtsOf(nodes, fileVars, warnings));
  } catch (e) {
    warnings.push((e as Error).message);
  }
  return { stmts, dialect: "PYTHON", warnings };
}
