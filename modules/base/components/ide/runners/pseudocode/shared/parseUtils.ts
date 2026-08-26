/**
 * 行解析工具：把 chevrotain lexer + parser 封装成"行文本 → LineAST / Expr"。
 * 各方言 parser 类通过本工厂生成解析实例。
 */
import type { EmbeddedActionsParser } from "chevrotain";
import { makeLexer } from "./lexer";
import type { LineAST } from "./statementParser";
import type { Expr, CaseValue } from "./ir";

export interface LineParserInstance {
  parseLine(text: string): LineAST;
  parseExpr(text: string): Expr;
  parseCaseValues(text: string): CaseValue[];
}

interface ParserCtor {
  new (): EmbeddedActionsParser & {
    line(): LineAST;
    expression(): Expr;
  };
}

export function makeLineParser(ParserClass: ParserCtor): LineParserInstance {
  const lexer = makeLexer();
  const parser = new ParserClass();

  function tokenize(text: string) {
    const result = lexer.tokenize(text);
    if (result.errors.length > 0) {
      const err = result.errors[0];
      throw new Error(`词法错误: ${err.message}`);
    }
    return result.tokens;
  }

  function check(parserErrors: unknown[]): void {
    if (parserErrors.length > 0) {
      const e = parserErrors[0] as { message: string };
      throw new Error(`语法错误: ${e.message}`);
    }
  }

  function parseLine(text: string): LineAST {
    parser.input = tokenize(text);
    const ast = parser.line();
    check(parser.errors);
    return ast;
  }

  function parseExpr(text: string): Expr {
    parser.input = tokenize(text);
    const expr = parser.expression();
    check(parser.errors);
    return expr;
  }

  function parseCaseValues(text: string): CaseValue[] {
    const parts = splitTopLevelComma(text);
    return parts.map((part) => {
      const m = part.match(/^(.+?)\s+TO\s+(.+)$/i);
      if (m) {
        return { kind: "range", low: parseExpr(m[1].trim()), high: parseExpr(m[2].trim()) };
      }
      return { kind: "value", expr: parseExpr(part) };
    });
  }

  return { parseLine, parseExpr, parseCaseValues };
}

/** 按顶层逗号分割（忽略引号内的逗号） */
export function splitTopLevelComma(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inStr = false;
  let inChar = false;
  let cur = "";
  for (const ch of text) {
    if (ch === '"') inStr = !inStr;
    else if (ch === "'") inChar = !inChar;
    else if (ch === "(" && !inStr && !inChar) depth++;
    else if (ch === ")" && !inStr && !inChar) depth--;
    if (ch === "," && depth === 0 && !inStr && !inChar) {
      parts.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim() !== "") parts.push(cur);
  return parts;
}
