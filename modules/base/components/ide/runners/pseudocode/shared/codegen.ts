/**
 * 共享代码生成工具：表达式打印器基类 + 缩进/行拼接工具。
 * IGCSE / ALEVEL 伪代码 printer 与 Python printer 都继承 ExprPrinter，
 * 通过覆盖内置函数调用、运算符写法实现方言差异。
 */
import type { Expr, BuiltinName, DataType } from "./ir";

export interface ExprStyle {
  /** 整除/取模/幂/拼接/比较 的写法 */
  divIntOp: string;
  modOp: string;
  powOp: string;
  concatOp: string;
  eqOp: string;
  neOp: string;
  andOp: string;
  orOp: string;
  notOp: string;
  boolTrue: string;
  boolFalse: string;
  /** 内置函数 → 目标代码形式（方法调用等特殊形态由 builtin 处理） */
  builtinNames: Partial<Record<BuiltinName, string>>;
  /** 函数式整除（IGCSE 伪代码 DIV(a,b)），true 时 divInt/mod 输出为函数 */
  funcDivMod?: boolean;
  /** 日期字面量格式 */
  date: (y: number, m: number, d: number) => string;
}

export abstract class ExprPrinter {
  constructor(protected style: ExprStyle) {}

  /** 运算符优先级（用于括号包裹） */
  private precedence(expr: Expr): number {
    switch (expr.kind) {
      case "binary":
        switch (expr.op) {
          case "or":
            return 1;
          case "and":
            return 2;
          case "eq":
          case "ne":
          case "lt":
          case "le":
          case "gt":
          case "ge":
            return 4;
          case "concat":
            return 5;
          case "add":
          case "sub":
            return 6;
          case "mul":
          case "div":
          case "divInt":
          case "mod":
            return 7;
          case "pow":
            return 8;
        }
        break;
      case "unary":
        return 9;
      default:
        return 10;
    }
    return 10;
  }

  protected needParen(outer: Expr, inner: Expr): boolean {
    const op = this.precedence(outer);
    const ip = this.precedence(inner);
    if (op > ip) return true;
    // 右操作数为 unary/binary 且同优先级时也需要括号（如 a - (b + c)）
    if (op === ip && outer.kind === "binary" && outer.op !== "pow") {
      return true;
    }
    return false;
  }

  private bin(op: string, left: Expr, right: Expr, paren: boolean): string {
    const l = this.exprToString(left);
    const r = this.exprToString(right);
    const s = `${l} ${op} ${r}`;
    return paren ? `(${s})` : s;
  }

  exprToString(expr: Expr): string {
    switch (expr.kind) {
      case "number":
        return formatNumber(expr.value);
      case "string":
        return this.styleQuote(expr.value);
      case "char":
        return `'${expr.value}'`;
      case "boolean":
        return expr.value ? this.style.boolTrue : this.style.boolFalse;
      case "date":
        return this.style.date(expr.year, expr.month, expr.day);
      case "identifier":
        return expr.name;
      case "arrayAccess":
        return (
          this.exprToString(expr.target) +
          "[" +
          expr.indices.map((i) => this.exprToString(i)).join(", ") +
          "]"
        );
      case "memberAccess":
        return `${this.exprToString(expr.target)}.${expr.member}`;
      case "deref":
        return `${this.exprToString(expr.target)}^`;
      case "unary":
        if (expr.op === "not") {
          return `${this.style.notOp} ${this.exprToString(expr.operand)}`;
        }
        return `-${this.exprToString(expr.operand)}`;
      case "binary": {
        const opMap: Record<string, string> = {
          add: "+",
          sub: "-",
          mul: "*",
          div: "/",
          divInt: this.style.divIntOp,
          mod: this.style.modOp,
          pow: this.style.powOp,
          eq: this.style.eqOp,
          ne: this.style.neOp,
          lt: "<",
          le: "<=",
          gt: ">",
          ge: ">=",
          and: this.style.andOp,
          or: this.style.orOp,
        };
        if ((expr.op === "divInt" || expr.op === "mod") && this.style.funcDivMod) {
          const fname = expr.op === "divInt" ? "DIV" : "MOD";
          return `${fname}(${this.exprToString(expr.left)}, ${this.exprToString(expr.right)})`;
        }
        const op = opMap[expr.op];
        return this.bin(op, expr.left, expr.right, this.needParen(expr, expr.left) || this.needParen(expr, expr.right));
      }
      case "concat":
        return this.bin(this.style.concatOp, expr.left, expr.right, this.needParen(expr, expr.left) || this.needParen(expr, expr.right));
      case "builtinCall":
        return this.builtinCall(expr);
      case "call":
        return `${expr.name}(${expr.args.map((a) => this.exprToString(a)).join(", ")})`;
      case "objectCall":
        return `${this.exprToString(expr.target)}.${expr.method}(${expr.args
          .map((a) => this.exprToString(a))
          .join(", ")})`;
      case "objectNew":
        return `NEW ${expr.className}(${expr.args.map((a) => this.exprToString(a)).join(", ")})`;
      default:
        return "";
    }
  }

  /** 内置函数调用（方言各自实现） */
  protected abstract builtinCall(expr: Extract<Expr, { kind: "builtinCall" }>): string;

  protected styleQuote(s: string): string {
    return `"${s.replace(/"/g, '\\"')}"`;
  }
}

export function formatNumber(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(n);
}

// ---------------- 行工具 ----------------

export function indentStr(level: number, width: number): string {
  return " ".repeat(level * width);
}

export function joinLines(lines: (string | null)[], indentLevel = 0, width = 4): string {
  const pad = " ".repeat(indentLevel * width);
  return lines
    .filter((l): l is string => l !== null && l !== "")
    .map((l) => pad + l)
    .join("\n");
}

/** 递归生成带缩进的语句列表 */
export interface CodeEmitter {
  stmtToLines(stmt: any, level: number): (string | null)[];
}

export function emitBlock(emitter: CodeEmitter, stmts: any[], level: number): string[] {
  const lines: string[] = [];
  for (const s of stmts) {
    lines.push(...emitter.stmtToLines(s, level));
  }
  return lines;
}

// ---------------- 数据类型 -> 目标代码 ----------------

export function dataTypeName(t: DataType): string {
  if (typeof t === "string") return t;
  switch (t.kind) {
    case "array":
      return `ARRAY[${t.dims
        .map((d) => `${exprDimString(d.low)}:${exprDimString(d.high)}`)
        .join(", ")}] OF ${dataTypeName(t.elem)}`;
    case "pointer":
      return `^${dataTypeName(t.elem)}`;
    case "user":
      return t.name;
    default:
      return "STRING";
  }
}

function exprDimString(e: Expr): string {
  return e.kind === "number" ? String(e.value) : "";
}
