/**
 * IGCSE (0478) 方言：伪代码 → IR → Python。
 * 规范要点：4 空格缩进、IF 换行 THEN、WHILE...DO、CONSTANT x <- v、
 * 函数式 DIV(a,b)/MOD(a,b)、SUBSTRING/ROUND/RANDOM、^ 幂、无 DATE/OOP/指针。
 */
import { allTokens } from "../shared/lexer";
import { StatementParser, type StatementConfig, type LineAST } from "../shared/statementParser";
import type { BlockConfig } from "../shared/blockParser";
import type { ParserAdapter } from "../shared/irAssembler";
import { parseSource } from "../shared/irAssembler";
import { makeLineParser, type LineParserInstance } from "../shared/parseUtils";
import { irToPython } from "../shared/pythonGen";
import type { BuiltinName, Program } from "../shared/ir";
import { pseudoPrinterIgcse } from "./printer";

const IGCSE_BUILTIN: Record<string, BuiltinName> = {
  length: "length",
  lcase: "lcase",
  ucase: "ucase",
  substring: "substring",
  round: "round",
  random: "random",
  div: "divInt",
  mod: "mod",
  eof: "eof",
};

const igcseStatementConfig: StatementConfig = {
  dialectName: "IGCSE",
  builtinFns: IGCSE_BUILTIN,
  constantAssign: "arrow",
  allowTypeSystem: false,
  allowOop: false,
  allowPointer: false,
  allowDate: false,
  procNoParens: true, // IGCSE 无参过程/函数可不带括号
};

class IgcseParser extends StatementParser {
  constructor() {
    super(igcseStatementConfig, allTokens);
    this.performSelfAnalysis();
  }
}

const igcseBlockConfig: BlockConfig = {
  kindOfOpen(line) {
    if (/^IF\b/i.test(line)) return "IF";
    if (/^WHILE\b/i.test(line)) return "WHILE";
    if (/^FOR\b/i.test(line)) return "FOR";
    if (/^REPEAT\s*$/i.test(line)) return "REPEAT";
    if (/^PROCEDURE\b/i.test(line)) return "PROCEDURE";
    if (/^FUNCTION\b/i.test(line)) return "FUNCTION";
    if (/^CASE\b/i.test(line)) return "CASE";
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

const lineParser: LineParserInstance = makeLineParser(IgcseParser);

const igcseAdapter: ParserAdapter = {
  blockConfig: igcseBlockConfig,
  dialect: "IGCSE",
  parseLine: (text: string): LineAST => lineParser.parseLine(text),
  parseExpr: (text: string) => lineParser.parseExpr(text),
  parseCaseValues: (text: string) => lineParser.parseCaseValues(text),
};

/** 伪代码 → IR */
export function igcseToIr(source: string): Program {
  return parseSource(source, igcseAdapter);
}

/** 伪代码 → Python */
export function igcseToPython(source: string): { code: string; warnings: string[] } {
  const program = parseSource(source, igcseAdapter);
  return irToPython(program);
}

/** Python → IGCSE 伪代码（反向，由 python 方言解析后经本 printer 输出） */
export function irToIgcse(program: Program): string {
  return pseudoPrinterIgcse(program);
}
