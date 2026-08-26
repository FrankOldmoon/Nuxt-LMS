/**
 * 共享伪代码生成器：IR → 伪代码（IGCSE / ALEVEL 共用）。
 * 方言差异全部通过 PseudoStyle 参数化：
 *  - constantAssign：常量赋值符号（IGCSE `<-` / ALEVEL `=`）
 *  - ifThenSameLine：IF 后 THEN 是否同行（ALEVEL 同行 / IGCSE 换行）
 *  - whileDo：WHILE 后是否有 DO（IGCSE 有 / ALEVEL 无）
 *  - procParens：无参过程/函数是否带括号（ALEVEL 带 / IGCSE 不带）
 *  - otherColon：OTHERWISE 后是否有冒号（ALEVEL 有 / IGCSE 无）
 *  - funcDivMod：DIV/MOD 是否函数式（IGCSE DIV(a,b) / ALEVEL 中缀 a DIV b）
 */
import {
  ExprPrinter,
  type ExprStyle,
  dataTypeName,
  emitBlock,
  type CodeEmitter,
} from "./codegen";
import type {
  Program,
  Stmt,
  Expr,
  BuiltinName,
  CaseValue,
  FileMode,
  ClassMember,
} from "./ir";

export interface PseudoStyle extends ExprStyle {
  indent: number;
  constantAssign: "arrow" | "equal";
  ifThenSameLine: boolean;
  whileDo: boolean;
  procParens: boolean;
  otherColon: boolean;
}

// ---------------- 表达式打印 ----------------

class PseudoExprPrinter extends ExprPrinter {
  constructor(style: ExprStyle) {
    super(style);
  }

  protected builtinCall(expr: Extract<Expr, { kind: "builtinCall" }>): string {
    const name =
      this.style.builtinNames[expr.name] ?? expr.name.toUpperCase();
    return `${name}(${expr.args
      .map((a) => this.exprToString(a))
      .join(", ")})`;
  }
}

// ---------------- 语句打印 ----------------

export class PseudoPrinter implements CodeEmitter {
  protected style: PseudoStyle;
  protected expr: PseudoExprPrinter;

  constructor(style: PseudoStyle) {
    this.style = style;
    this.expr = new PseudoExprPrinter(style);
  }

  private ind(level: number): string {
    return " ".repeat(level * this.style.indent);
  }

  private e(e: Expr): string {
    return this.expr.exprToString(e);
  }

  /** 打印一行语句（用于 CASE 分支同行输出；多行语句返回 null 走换行） */
  private inline(stmt: Stmt): string | null {
    const lines = this.stmtToLines(stmt, 0).filter((l) => l !== null && l !== "");
    if (lines.length !== 1) return null;
    return lines[0];
  }

  stmtToLines(s: Stmt, level: number): (string | null)[] {
    const ind = this.ind(level);
    switch (s.kind) {
      case "comment":
        return [ind + s.text.replace(/^\/\/\s*/, "// ")];
      case "assign":
        return [ind + `${this.e(s.target)} <- ${this.e(s.value)}`];
      case "declare":
        return [ind + `DECLARE ${s.name} : ${dataTypeName(s.type)}`];
      case "const":
        return [
          ind +
            `CONSTANT ${s.name} ${
              this.style.constantAssign === "equal" ? "=" : "<-"
            } ${this.e(s.value)}`,
        ];
      case "input":
        return [ind + `INPUT ${s.targets.map((t) => this.e(t)).join(", ")}`];
      case "output":
        return [ind + `OUTPUT ${s.values.map((v) => this.e(v)).join(", ")}`];
      case "if":
        return this.ifLines(s.branches, level);
      case "case":
        return this.caseLines(s.subject, s.branches, s.otherwise, level);
      case "for": {
        const lines: string[] = [];
        let head = `FOR ${s.variable} <- ${this.e(s.from)} TO ${this.e(s.to)}`;
        if (s.step) head += ` STEP ${this.e(s.step)}`;
        lines.push(ind + head);
        lines.push(...emitBlock(this, s.body, level + 1));
        lines.push(ind + `NEXT ${s.variable}`);
        return lines;
      }
      case "while": {
        const lines: string[] = [];
        lines.push(ind + `WHILE ${this.e(s.cond)}${this.style.whileDo ? " DO" : ""}`);
        lines.push(...emitBlock(this, s.body, level + 1));
        lines.push(ind + "ENDWHILE");
        return lines;
      }
      case "repeat": {
        const lines: string[] = [];
        lines.push(ind + "REPEAT");
        lines.push(...emitBlock(this, s.body, level + 1));
        lines.push(ind + `UNTIL ${this.e(s.cond)}`);
        return lines;
      }
      case "proc":
        return this.procLines(s.fn, level);
      case "return":
        return [ind + `RETURN${s.value ? " " + this.e(s.value) : ""}`];
      case "call": {
        const args = s.args.map((a) => this.e(a)).join(", ");
        const call = this.style.procParens
          ? `CALL ${s.name}(${args})`
          : args
            ? `CALL ${s.name}(${args})`
            : `CALL ${s.name}`;
        return [ind + call];
      }
      case "fileOp":
        return this.fileOpLines(s, level);
      case "typeDef":
        return this.typeDefLines(s.name, s.def, level);
      case "define":
        return [
          ind +
            `DEFINE ${s.name} (${s.values.map((v) => this.e(v)).join(", ")}) : ${s.typeName}`,
        ];
      case "classDef":
        return this.classLines(s.name, s.inherits, s.members, level);
      default:
        return [];
    }
  }

  // ---------- IF ----------
  private ifLines(
    branches: { cond: Expr | null; body: Stmt[] }[],
    level: number
  ): (string | null)[] {
    if (branches.length === 0) return [];
    const ind = this.ind(level);
    const [first, ...rest] = branches;
    const lines: string[] = [];

    if (first.cond) {
      const head = `IF ${this.e(first.cond)}`;
      if (this.style.ifThenSameLine) {
        lines.push(ind + head + " THEN");
        lines.push(...emitBlock(this, first.body, level + 1));
      } else {
        lines.push(ind + head);
        lines.push(this.ind(level + 1) + "THEN");
        lines.push(...emitBlock(this, first.body, level + 2));
      }
    } else {
      // 首个分支即 else（异常情况，直接输出 body）
      lines.push(...emitBlock(this, first.body, level));
    }

    if (rest.length > 0) {
      // 多分支：else 直接同级输出 body；elif 链才嵌套 IF
      const next = rest[0];
      lines.push(ind + "ELSE");
      if (next.cond === null && rest.length === 1) {
        lines.push(...emitBlock(this, next.body, level + 1));
      } else {
        const fl = this.stmtToLines({ kind: "if", branches: rest }, level + 1);
        lines.push(...(fl.filter((l) => l !== null) as string[]));
      }
    } else if (first.cond === null) {
      // 无后续分支但首分支为 else：结构异常，忽略
    }
    lines.push(ind + "ENDIF");
    return lines;
  }

  // ---------- CASE ----------
  private caseLines(
    subject: Expr,
    branches: { values: CaseValue[]; body: Stmt[] }[],
    otherwise: Stmt[] | null,
    level: number
  ): (string | null)[] {
    const ind = this.ind(level);
    const sub = this.ind(level + 1);
    const lines: string[] = [];
    lines.push(ind + `CASE OF ${this.e(subject)}`);

    const emitBody = (body: Stmt[]): (string | null)[] => {
      const out: (string | null)[] = [];
      if (body.length > 0) {
        const first = this.inline(body[0]);
        if (first !== null) {
          out.push(sub + first);
          out.push(...emitBlock(this, body.slice(1), level + 1));
        } else {
          out.push(...emitBlock(this, body, level + 1));
        }
      }
      return out;
    };

    for (const b of branches) {
      const valuesStr = b.values
        .map((v) =>
          v.kind === "range"
            ? `${this.e(v.low)} TO ${this.e(v.high)}`
            : this.e(v.expr)
        )
        .join(", ");
      const head = `${valuesStr} :`;
      if (b.body.length > 0) {
        const first = this.inline(b.body[0]);
        if (first !== null) {
          lines.push(sub + `${head} ${first}`);
          lines.push(...emitBlock(this, b.body.slice(1), level + 1));
        } else {
          lines.push(sub + head);
          lines.push(...emitBlock(this, b.body, level + 1));
        }
      } else {
        lines.push(sub + head);
      }
    }

    if (otherwise && otherwise.length > 0) {
      const first = this.inline(otherwise[0]);
      const sep = this.style.otherColon ? " : " : " ";
      if (first !== null) {
        lines.push(sub + `OTHERWISE${sep}${first}`);
        lines.push(...emitBlock(this, otherwise.slice(1), level + 1));
      } else {
        lines.push(sub + (this.style.otherColon ? "OTHERWISE :" : "OTHERWISE"));
        lines.push(...emitBlock(this, otherwise, level + 1));
      }
    } else if (otherwise) {
      lines.push(sub + (this.style.otherColon ? "OTHERWISE :" : "OTHERWISE"));
    }
    lines.push(ind + "ENDCASE");
    return lines;
  }

  // ---------- 过程 / 函数 ----------
  private procLines(
    fn: { name: string; params: { name: string; type: import("./ir").DataType; byRef: boolean }[]; isFunction: boolean; returnType: import("./ir").DataType | null; body: Stmt[] },
    level: number
  ): (string | null)[] {
    const ind = this.ind(level);
    const params = fn.params
      .map(
        (p) =>
          `${p.byRef ? "BYREF " : ""}${p.name} : ${dataTypeName(p.type)}`
      )
      .join(", ");
    const hasParens = this.style.procParens || params !== "";
    const paramWrap = (body: string) =>
      hasParens ? `${body}(${params})` : body;
    let head: string;
    if (fn.isFunction) {
      head = `FUNCTION ${paramWrap(fn.name)} RETURNS ${
        fn.returnType ? dataTypeName(fn.returnType) : "INTEGER"
      }`;
    } else {
      head = `PROCEDURE ${paramWrap(fn.name)}`;
    }
    const lines: string[] = [];
    lines.push(ind + head);
    lines.push(...emitBlock(this, fn.body, level + 1));
    lines.push(ind + (fn.isFunction ? "ENDFUNCTION" : "ENDPROCEDURE"));
    return lines;
  }

  // ---------- 文件操作 ----------
  private fileOpLines(
    s: Extract<Stmt, { kind: "fileOp" }>,
    level: number
  ): (string | null)[] {
    const ind = this.ind(level);
    const modeMap: Record<FileMode, string> = {
      READ: "READ",
      WRITE: "WRITE",
      APPEND: "APPEND",
      RANDOM: "RANDOM",
    };
    switch (s.op) {
      case "open":
        return [
          ind +
            `OPENFILE ${this.e(s.file)} FOR ${modeMap[s.mode ?? "READ"]}`,
        ];
      case "read":
        return [
          ind +
            `READFILE ${this.e(s.file)}, ${
              s.target ? this.e(s.target) : ""
            }`,
        ];
      case "write":
        return [
          ind +
            `WRITEFILE ${this.e(s.file)}, ${s.data ? this.e(s.data) : ""}`,
        ];
      case "close":
        return [ind + `CLOSEFILE ${this.e(s.file)}`];
      case "seek":
        return [
          ind +
            `SEEK ${this.e(s.file)}, ${s.address ? this.e(s.address) : "0"}`,
        ];
      case "get":
        return [
          ind +
            `GETRECORD ${this.e(s.file)}, ${
              s.target ? this.e(s.target) : ""
            }`,
        ];
      case "put":
        return [
          ind +
            `PUTRECORD ${this.e(s.file)}, ${s.data ? this.e(s.data) : ""}`,
        ];
      default:
        return [];
    }
  }

  // ---------- TYPE ----------
  private typeDefLines(
    name: string,
    def: import("./ir").TypeDefBody,
    level: number
  ): (string | null)[] {
    const ind = this.ind(level);
    switch (def.kind) {
      case "enum":
        return [ind + `TYPE ${name} = (${def.values.join(", ")})`];
      case "pointer":
        return [ind + `TYPE ${name} = ^${dataTypeName(def.elem)}`];
      case "set":
        return [ind + `TYPE ${name} = SET OF ${dataTypeName(def.elem)}`];
      case "record": {
        const lines: string[] = [];
        lines.push(ind + `TYPE ${name}`);
        for (const f of def.fields) {
          lines.push(this.ind(level + 1) + `DECLARE ${f.name} : ${dataTypeName(f.type)}`);
        }
        lines.push(ind + "ENDTYPE");
        return lines;
      }
      default:
        return [];
    }
  }

  // ---------- CLASS ----------
  private classLines(
    name: string,
    inherits: string | null,
    members: ClassMember[],
    level: number
  ): (string | null)[] {
    const ind = this.ind(level);
    const lines: string[] = [];
    lines.push(ind + `CLASS ${name}${inherits ? " INHERITS " + inherits : ""}`);
    for (const m of members) {
      if (m.kind === "field") {
        lines.push(
          this.ind(level + 1) +
            `${m.visibility} ${m.name} : ${dataTypeName(m.type)}`
        );
      } else {
        const fn = m.fn;
        const params = fn.params
          .map((p) => `${p.byRef ? "BYREF " : ""}${p.name} : ${dataTypeName(p.type)}`)
          .join(", ");
        const kind = fn.isFunction ? "FUNCTION" : "PROCEDURE";
        const ret = fn.isFunction
          ? ` RETURNS ${fn.returnType ? dataTypeName(fn.returnType) : "INTEGER"}`
          : "";
        lines.push(
          this.ind(level + 1) + `${m.visibility} ${kind} ${fn.name}(${params})${ret}`
        );
        lines.push(...emitBlock(this, fn.body, level + 2));
        lines.push(this.ind(level + 1) + (fn.isFunction ? "ENDFUNCTION" : "ENDPROCEDURE"));
      }
    }
    lines.push(ind + "ENDCLASS");
    return lines;
  }
}

/** IR → 伪代码（按 style 输出） */
export function pseudoPrint(program: Program, style: PseudoStyle): string {
  const p = new PseudoPrinter(style);
  return emitBlock(p, program.stmts, 0).join("\n");
}
