/**
 * 共享 IR 组装器：把"块树 + 行内 LineAST"组装成语义 IR Program。
 * IGCSE 与 ALEVEL 的块结构一致，本组装器由双方言复用，
 * 方言差异只通过 ParserAdapter 注入（块分类、行解析、表达式解析）。
 */
import { buildBlockTree, type BlockConfig, type BlockNode, type BlockLine } from "./blockParser";
import type { LineAST } from "./statementParser";
import type { Program, Stmt, CaseValue, Expr, TypeDefBody, Param, ClassMember, DataType } from "./ir";

export interface ParserAdapter {
  blockConfig: BlockConfig;
  dialect: "IGCSE" | "ALEVEL";
  parseLine(text: string): LineAST; // 行内解析（可能抛错）
  parseExpr(text: string): Expr; // 表达式解析（UNTIL / CASE 值等）
  parseCaseValues(text: string): CaseValue[]; // CASE 分支值（支持 TO 范围）
}

export interface ParseIssue {
  lineNo: number;
  text: string;
  message: string;
}

export function parseSource(source: string, adapter: ParserAdapter): Program {
  const root = buildBlockTree(source, adapter.blockConfig);
  const issues: ParseIssue[] = [];
  let stmts: Stmt[] = [];
  try {
    stmts = stmtsOf(root, adapter, issues);
  } catch (e) {
    issues.push({ lineNo: 0, text: "", message: (e as Error).message });
  }
  return { stmts, dialect: adapter.dialect, warnings: issues.map((i) => i.message) };
}

function isBlockLine(item: BlockLine | BlockNode): item is BlockLine {
  return "role" in item && !("body" in item);
}

function stmtsOf(node: BlockNode, adapter: ParserAdapter, issues: ParseIssue[]): Stmt[] {
  const out: Stmt[] = [];
  for (const item of node.body) {
    if (isBlockLine(item)) {
      if (item.role === "comment") {
        out.push({ kind: "comment", text: item.text });
      } else {
        const ast = safeLine(item, adapter, issues);
        if (ast) {
          if (ast.kind === "stmt") out.push(ast.stmt);
          else if (ast.kind === "define") {
            out.push({
              kind: "define",
              name: ast.name,
              values: ast.values,
              typeName: ast.typeName,
            });
          }
          // 其他块头类型不应出现在普通行位置
        }
      }
    } else {
      out.push(blockToStmt(item, adapter, issues));
    }
  }
  return out;
}

function safeLine(
  line: BlockLine,
  adapter: ParserAdapter,
  issues: ParseIssue[]
): LineAST | null {
  try {
    return adapter.parseLine(line.text);
  } catch (e) {
    issues.push({
      lineNo: line.lineNo,
      text: line.text,
      message: `第 ${line.lineNo} 行解析失败: ${(e as Error).message}`,
    });
    return null;
  }
}

function blockToStmt(
  node: BlockNode,
  adapter: ParserAdapter,
  issues: ParseIssue[]
): Stmt {
  switch (node.kind) {
    case "IF":
      return ifToStmt(node, adapter, issues);
    case "WHILE": {
      const h = safeLine({ text: node.headerText, lineNo: 0, role: "normal" }, adapter, issues) as
        | LineAST
        | null;
      return {
        kind: "while",
        cond: (h as { kind: "while"; cond: Expr }).cond,
        body: stmtsOf(node, adapter, issues),
      };
    }
    case "FOR": {
      const h = safeLine({ text: node.headerText, lineNo: 0, role: "normal" }, adapter, issues) as
        | LineAST
        | null;
      const f = h as { kind: "for"; variable: string; from: Expr; to: Expr; step: Expr | null };
      return { kind: "for", variable: f.variable, from: f.from, to: f.to, step: f.step, body: stmtsOf(node, adapter, issues) };
    }
    case "REPEAT": {
      let cond: Expr = { kind: "boolean", value: true };
      if (node.closeText) {
        try {
          cond = adapter.parseExpr(node.closeText.replace(/^UNTIL\b/i, "").trim());
        } catch (e) {
          issues.push({ lineNo: 0, text: node.closeText, message: (e as Error).message });
        }
      }
      return { kind: "repeat", cond, body: stmtsOf(node, adapter, issues) };
    }
    case "PROCEDURE": {
      const h = safeLine({ text: node.headerText, lineNo: 0, role: "normal" }, adapter, issues) as
        | LineAST
        | null;
      const p = h as { kind: "procedure"; name: string; params: Param[] };
      return {
        kind: "proc",
        fn: { name: p.name, params: p.params, isFunction: false, returnType: null, body: stmtsOf(node, adapter, issues) },
      };
    }
    case "FUNCTION": {
      const h = safeLine({ text: node.headerText, lineNo: 0, role: "normal" }, adapter, issues) as
        | LineAST
        | null;
      const f = h as { kind: "function"; name: string; params: Param[]; returnType: DataType };
      return {
        kind: "proc",
        fn: { name: f.name, params: f.params, isFunction: true, returnType: f.returnType, body: stmtsOf(node, adapter, issues) },
      };
    }
    case "CASE":
      return caseToStmt(node, adapter, issues);
    case "TYPE":
      return typeToStmt(node, adapter, issues);
    case "CLASS":
      return classToStmt(node, adapter, issues);
    default:
      return { kind: "comment", text: node.headerText };
  }
}

function ifToStmt(node: BlockNode, adapter: ParserAdapter, issues: ParseIssue[]): Stmt {
  const h = safeLine({ text: node.headerText, lineNo: 0, role: "normal" }, adapter, issues) as
    | LineAST
    | null;
  const cond = (h as { kind: "if"; cond: Expr }).cond;
  const branches: { cond: Expr | null; body: Stmt[] }[] = [];
  let cur: { cond: Expr | null; body: Stmt[] } = { cond, body: [] };

  for (const item of node.body) {
    if (isBlockLine(item) && item.role === "branch" && item.branchKind === "ELSE") {
      branches.push(cur);
      cur = { cond: null, body: [] };
    } else if (isBlockLine(item) && item.role === "comment") {
      cur.body.push({ kind: "comment", text: item.text });
    } else if (isBlockLine(item)) {
      const ast = safeLine(item, adapter, issues);
      if (ast && ast.kind === "stmt") cur.body.push(ast.stmt);
    } else {
      cur.body.push(blockToStmt(item, adapter, issues));
    }
  }
  branches.push(cur);
  return { kind: "if", branches };
}

function caseToStmt(node: BlockNode, adapter: ParserAdapter, issues: ParseIssue[]): Stmt {
  const h = safeLine({ text: node.headerText, lineNo: 0, role: "normal" }, adapter, issues) as
    | LineAST
    | null;
  const subject = (h as { kind: "case"; subject: Expr }).subject;

  const branches: { values: CaseValue[]; body: Stmt[] }[] = [];
  let otherwise: Stmt[] | null = null;
  let cur: { values: CaseValue[]; body: Stmt[] } | null = null;

  const ensureCur = (): { values: CaseValue[]; body: Stmt[] } => {
    if (!cur) {
      cur = { values: [], body: [] };
      branches.push(cur);
    }
    return cur;
  };
  const targetOf = (): Stmt[] => {
    if (otherwise !== null) return otherwise;
    return ensureCur().body;
  };

  for (const item of node.body) {
    if (isBlockLine(item) && item.role === "branch" && item.branchKind === "OTHERWISE") {
      otherwise = [];
      cur = null;
      // ALEVEL 允许 "OTHERWISE : stmt"（含冒号），需剥离冒号
      const rest = item.text
        .replace(/^OTHERWISE\b/i, "")
        .replace(/^\s*:\s*/, "")
        .trim();
      if (rest) {
        const ast = safeLine({ text: rest, lineNo: item.lineNo, role: "normal" }, adapter, issues);
        if (ast && ast.kind === "stmt") otherwise.push(ast.stmt);
      }
    } else if (
      isBlockLine(item) &&
      item.role === "normal" &&
      containsTopLevelColon(item.text)
    ) {
      // 分支头行：值 : 语句
      const idx = topLevelColonIndex(item.text);
      const valuesText = item.text.slice(0, idx).trim();
      const restText = item.text.slice(idx + 1).trim();
      const values = adapter.parseCaseValues(valuesText);
      ensureCur();
      cur!.values = values;
      if (restText) {
        const ast = safeLine({ text: restText, lineNo: item.lineNo, role: "normal" }, adapter, issues);
        if (ast && ast.kind === "stmt") cur!.body.push(ast.stmt);
      }
    } else if (isBlockLine(item) && item.role === "comment") {
      targetOf().push({ kind: "comment", text: item.text });
    } else if (isBlockLine(item)) {
      const ast = safeLine(item, adapter, issues);
      if (ast && ast.kind === "stmt") targetOf().push(ast.stmt);
    } else {
      targetOf().push(blockToStmt(item, adapter, issues));
    }
  }
  return { kind: "case", subject, branches, otherwise };
}

function typeToStmt(node: BlockNode, adapter: ParserAdapter, issues: ParseIssue[]): Stmt {
  const h = safeLine({ text: node.headerText, lineNo: 0, role: "normal" }, adapter, issues) as
    | LineAST
    | null;
  const t = h as
    | { kind: "typeEnum"; name: string; values: string[] }
    | { kind: "typePointer"; name: string; elem: DataType }
    | { kind: "typeSet"; name: string; elem: DataType }
    | { kind: "typeRecord"; name: string };

  if (t.kind === "typeEnum") {
    return { kind: "typeDef", name: t.name, def: { kind: "enum", values: t.values } };
  }
  if (t.kind === "typePointer") {
    return { kind: "typeDef", name: t.name, def: { kind: "pointer", elem: t.elem } };
  }
  if (t.kind === "typeSet") {
    return { kind: "typeDef", name: t.name, def: { kind: "set", elem: t.elem } };
  }
  // RECORD：body 中的 DECLARE 行为字段
  const fields: { name: string; type: DataType }[] = [];
  for (const item of node.body) {
    if (isBlockLine(item)) {
      const ast = safeLine(item, adapter, issues);
      if (ast && ast.kind === "stmt" && ast.stmt.kind === "declare") {
        fields.push({ name: ast.stmt.name, type: ast.stmt.type });
      }
    } else {
      issues.push({ lineNo: 0, text: item.headerText, message: "RECORD 中不允许嵌套块" });
    }
  }
  return { kind: "typeDef", name: t.name, def: { kind: "record", fields } };
}

function classToStmt(node: BlockNode, adapter: ParserAdapter, issues: ParseIssue[]): Stmt {
  const h = safeLine({ text: node.headerText, lineNo: 0, role: "normal" }, adapter, issues) as
    | LineAST
    | null;
  const c = h as { kind: "classHeader"; name: string; inherits: string | null };
  const members: ClassMember[] = [];

  const addProc = (
    name: string,
    params: Param[],
    isFunction: boolean,
    returnType: DataType | null,
    visibility: "PUBLIC" | "PRIVATE",
    body: Stmt[]
  ) => {
    members.push({
      kind: "method",
      visibility,
      fn: { name, params, isFunction, returnType, body },
    });
  };

  for (const item of node.body) {
    if (isBlockLine(item)) {
      const ast = safeLine(item, adapter, issues);
      if (ast) {
        if (ast.kind === "classField") {
          members.push({ kind: "field", name: ast.name, type: ast.type, visibility: ast.visibility });
        } else if (ast.kind === "procedure" || ast.kind === "function") {
          addProc(
            ast.name,
            ast.params,
            ast.kind === "function",
            ast.kind === "function" ? ast.returnType : null,
            ast.visibility ?? "PUBLIC",
            []
          );
        }
      }
    } else {
      // 方法子块
      if (item.kind === "PROCEDURE" || item.kind === "FUNCTION") {
        const isFn = item.kind === "FUNCTION";
        const ast = safeLine({ text: item.headerText, lineNo: 0, role: "normal" }, adapter, issues) as
          | LineAST
          | null;
        if (ast && (ast.kind === "procedure" || ast.kind === "function")) {
          addProc(
            ast.name,
            ast.params,
            isFn,
            isFn ? ast.returnType : null,
            ast.visibility ?? "PUBLIC",
            stmtsOf(item, adapter, issues)
          );
        }
      } else {
        issues.push({ lineNo: 0, text: item.headerText, message: "CLASS 中不允许该嵌套块" });
      }
    }
  }
  return { kind: "classDef", name: c.name, inherits: c.inherits, members };
}

// ---------------- 工具 ----------------

/** 判断字符串中是否存在"不在引号内"的冒号 */
export function containsTopLevelColon(text: string): boolean {
  return topLevelColonIndex(text) >= 0;
}

export function topLevelColonIndex(text: string): number {
  let inStr = false;
  let inChar = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') inStr = !inStr;
    else if (ch === "'") inChar = !inChar;
    else if (ch === ":" && !inStr && !inChar) return i;
  }
  return -1;
}
