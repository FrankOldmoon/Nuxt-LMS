/**
 * ALEVEL (9618) 方言：伪代码 → IR → Python。
 * 规范要点：CONSTANT x = v、IF...THEN 同行、WHILE 无 DO、过程/函数恒带括号、
 * 中缀 DIV/MOD、RIGHT/MID/INT/RAND、& 拼接、DATE、TYPE（枚举/记录/集合/指针）、
 * BYREF/BYVAL、CLASS 面向对象、文件 RANDOM/SEEK/GETRECORD/PUTRECORD。
 */
import { allTokens } from "../shared/lexer";
import { StatementParser, type StatementConfig, type LineAST } from "../shared/statementParser";
import type { BlockConfig } from "../shared/blockParser";
import type { ParserAdapter } from "../shared/irAssembler";
import { parseSource } from "../shared/irAssembler";
import { makeLineParser, type LineParserInstance } from "../shared/parseUtils";
import { irToPython } from "../shared/pythonGen";
import type { BuiltinName, Program } from "../shared/ir";
import { pseudoPrinterAlevel } from "./printer";

const ALEVEL_BUILTIN: Record<string, BuiltinName> = {
  length: "length",
  lcase: "lcase",
  ucase: "ucase",
  substring: "substring",
  mid: "mid",
  right: "right",
  int: "int",
  rand: "rand",
  div: "divInt",
  mod: "mod",
  eof: "eof",
};

const alevelStatementConfig: StatementConfig = {
  dialectName: "ALEVEL",
  builtinFns: ALEVEL_BUILTIN,
  constantAssign: "equal",
  allowTypeSystem: true,
  allowOop: true,
  allowPointer: true,
  allowDate: true,
  allowObjectCalls: true,
  procNoParens: false,
};

class AlevelParser extends StatementParser {
  constructor() {
    super(alevelStatementConfig, allTokens);
    this.performSelfAnalysis();
  }
}

const alevelBlockConfig: BlockConfig = {
  kindOfOpen(line) {
    if (/^IF\b/i.test(line)) return "IF";
    if (/^WHILE\b/i.test(line)) return "WHILE";
    if (/^FOR\b/i.test(line)) return "FOR";
    if (/^REPEAT\s*$/i.test(line)) return "REPEAT";
    if (/^PROCEDURE\b/i.test(line)) return "PROCEDURE";
    if (/^FUNCTION\b/i.test(line)) return "FUNCTION";
    if (/^CASE\b/i.test(line)) return "CASE";
    if (/^TYPE\b/i.test(line)) return "TYPE";
    if (/^CLASS\b/i.test(line)) return "CLASS";
    return null;
  },
  kindOfClose(line) {
    if (/^ENDIF\b/i.test(line)) return "IF";
    if (/^ENDWHILE\b/i.test(line)) return "WHILE";
    if (/^NEXT\b/i.test(line)) return "FOR";
    if (/^UNTIL\b/i.test(line)) return "REPEAT";
    if (/^ENDPROCEDURE\b/i.test(line)) return "PROCEDURE";
    if (/^ENDFUNCTION\b/i.test(line)) return "FUNCTION";
    if (/^ENDCASE\b/i.test(line)) return "CASE";
    if (/^ENDTYPE\b/i.test(line)) return "TYPE";
    if (/^ENDCLASS\b/i.test(line)) return "CLASS";
    return null;
  },
  branchOf(line) {
    if (/^ELSE\s*$/i.test(line)) return "ELSE";
    if (/^OTHERWISE\b/i.test(line)) return "OTHERWISE";
    return null;
  },
  isComment(line) {
    return /^\/\//.test(line);
  },
};

const lineParser: LineParserInstance = makeLineParser(AlevelParser);

const alevelAdapter: ParserAdapter = {
  blockConfig: alevelBlockConfig,
  dialect: "ALEVEL",
  parseLine: (text: string): LineAST => lineParser.parseLine(text),
  parseExpr: (text: string) => lineParser.parseExpr(text),
  parseCaseValues: (text: string) => lineParser.parseCaseValues(text),
};

/** 伪代码 → IR */
export function alevelToIr(source: string): Program {
  return parseSource(source, alevelAdapter);
}

/** 伪代码 → Python */
export function alevelToPython(source: string): { code: string; warnings: string[] } {
  const program = parseSource(source, alevelAdapter);
  return irToPython(program);
}

/** Python → ALEVEL 伪代码（反向，由 python 方言解析后经本 printer 输出） */
export function irToAlevel(program: Program): string {
  return pseudoPrinterAlevel(program);
}
