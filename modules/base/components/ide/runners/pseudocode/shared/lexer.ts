/**
 * 共享词法器（chevrotain token 定义）。
 * IGCSE 与 ALEVEL 共用同一份 token 超集，语法差异由各自的 parser 承担。
 * 内置函数名（LENGTH/SUBSTRING/RANDOM/EOF 等）刻意不作为关键字 token，
 * 而是保留为普通标识符，由表达式规则按"方言内置函数映射表"识别，
 * 这样既支持内置函数，也不会与用户自定义函数名冲突。
 */
import { createToken, Lexer } from "chevrotain";
import type { TokenType } from "chevrotain";

// 关键字（作为独立 token，避免被 Identifier 吞掉）
const IF = createToken({ name: "IF", pattern: /IF\b/ });
const THEN = createToken({ name: "THEN", pattern: /THEN\b/ });
const ELSE = createToken({ name: "ELSE", pattern: /ELSE\b/ });
const ENDIF = createToken({ name: "ENDIF", pattern: /ENDIF\b/ });
const CASE = createToken({ name: "CASE", pattern: /CASE\b/ });
const OF = createToken({ name: "OF", pattern: /OF\b/ });
const OTHERWISE = createToken({ name: "OTHERWISE", pattern: /OTHERWISE\b/ });
const ENDCASE = createToken({ name: "ENDCASE", pattern: /ENDCASE\b/ });
const FOR = createToken({ name: "FOR", pattern: /FOR\b/ });
const TO = createToken({ name: "TO", pattern: /TO\b/ });
const STEP = createToken({ name: "STEP", pattern: /STEP\b/ });
const NEXT = createToken({ name: "NEXT", pattern: /NEXT\b/ });
const WHILE = createToken({ name: "WHILE", pattern: /WHILE\b/ });
const DO = createToken({ name: "DO", pattern: /DO\b/ });
const ENDWHILE = createToken({ name: "ENDWHILE", pattern: /ENDWHILE\b/ });
const REPEAT = createToken({ name: "REPEAT", pattern: /REPEAT\b/ });
const UNTIL = createToken({ name: "UNTIL", pattern: /UNTIL\b/ });
const PROCEDURE = createToken({ name: "PROCEDURE", pattern: /PROCEDURE\b/ });
const ENDPROCEDURE = createToken({
  name: "ENDPROCEDURE",
  pattern: /ENDPROCEDURE\b/,
});
const FUNCTION = createToken({ name: "FUNCTION", pattern: /FUNCTION\b/ });
const ENDFUNCTION = createToken({ name: "ENDFUNCTION", pattern: /ENDFUNCTION\b/ });
const RETURNS = createToken({ name: "RETURNS", pattern: /RETURNS\b/ });
const RETURN = createToken({ name: "RETURN", pattern: /RETURN\b/ });
const CALL = createToken({ name: "CALL", pattern: /CALL\b/ });
const DECLARE = createToken({ name: "DECLARE", pattern: /DECLARE\b/ });
const CONSTANT = createToken({ name: "CONSTANT", pattern: /CONSTANT\b/ });
const INPUT = createToken({ name: "INPUT", pattern: /INPUT\b/ });
const OUTPUT = createToken({ name: "OUTPUT", pattern: /OUTPUT\b/ });
const PRINT = createToken({ name: "PRINT", pattern: /PRINT\b/ }); // OUTPUT 的兼容别名
const AND = createToken({ name: "AND", pattern: /AND\b/ });
const OR = createToken({ name: "OR", pattern: /OR\b/ });
const NOT = createToken({ name: "NOT", pattern: /NOT\b/ });
const TRUE = createToken({ name: "TRUE", pattern: /TRUE\b/ });
const FALSE = createToken({ name: "FALSE", pattern: /FALSE\b/ });
const OPENFILE = createToken({ name: "OPENFILE", pattern: /OPENFILE\b/ });
const READFILE = createToken({ name: "READFILE", pattern: /READFILE\b/ });
const WRITEFILE = createToken({ name: "WRITEFILE", pattern: /WRITEFILE\b/ });
const CLOSEFILE = createToken({ name: "CLOSEFILE", pattern: /CLOSEFILE\b/ });
const SEEK = createToken({ name: "SEEK", pattern: /SEEK\b/ });
const GETRECORD = createToken({ name: "GETRECORD", pattern: /GETRECORD\b/ });
const PUTRECORD = createToken({ name: "PUTRECORD", pattern: /PUTRECORD\b/ });
// 文件模式中的关键字（READ/WRITE/APPEND）。RANDOM 既作函数名也作文件模式，保留为标识符。
const READ = createToken({ name: "READ", pattern: /READ\b/ });
const WRITE = createToken({ name: "WRITE", pattern: /WRITE\b/ });
const APPEND = createToken({ name: "APPEND", pattern: /APPEND\b/ });
const TYPE = createToken({ name: "TYPE", pattern: /TYPE\b/ });
const ENDTYPE = createToken({ name: "ENDTYPE", pattern: /ENDTYPE\b/ });
const DEFINE = createToken({ name: "DEFINE", pattern: /DEFINE\b/ });
const SET = createToken({ name: "SET", pattern: /SET\b/ });
const CLASS = createToken({ name: "CLASS", pattern: /CLASS\b/ });
const ENDCLASS = createToken({ name: "ENDCLASS", pattern: /ENDCLASS\b/ });
const INHERITS = createToken({ name: "INHERITS", pattern: /INHERITS\b/ });
const NEW = createToken({ name: "NEW", pattern: /NEW\b/ });
const SUPER = createToken({ name: "SUPER", pattern: /SUPER\b/ });
const PUBLIC = createToken({ name: "PUBLIC", pattern: /PUBLIC\b/ });
const PRIVATE = createToken({ name: "PRIVATE", pattern: /PRIVATE\b/ });
const BYREF = createToken({ name: "BYREF", pattern: /BYREF\b/ });
const BYVAL = createToken({ name: "BYVAL", pattern: /BYVAL\b/ });
const ARRAY = createToken({ name: "ARRAY", pattern: /ARRAY\b/ });
const INTEGER = createToken({ name: "INTEGER", pattern: /INTEGER\b/ });
const REAL = createToken({ name: "REAL", pattern: /REAL\b/ });
const CHAR = createToken({ name: "CHAR", pattern: /CHAR\b/ });
const STRING = createToken({ name: "STRING", pattern: /STRING\b/ });
const BOOLEAN = createToken({ name: "BOOLEAN", pattern: /BOOLEAN\b/ });
const DATE = createToken({ name: "DATE", pattern: /DATE\b/ });

// 运算符 / 标点
const AssignArrow = createToken({ name: "AssignArrow", pattern: /<-/ });
const Equal = createToken({ name: "Equal", pattern: /=/ });
const Ne = createToken({ name: "Ne", pattern: /<>/ });
const Le = createToken({ name: "Le", pattern: /<=/ });
const Ge = createToken({ name: "Ge", pattern: />=/ });
const Lt = createToken({ name: "Lt", pattern: /</ });
const Gt = createToken({ name: "Gt", pattern: />/ });
const Plus = createToken({ name: "Plus", pattern: /\+/ });
const Minus = createToken({ name: "Minus", pattern: /-/ });
const Multiply = createToken({ name: "Multiply", pattern: /\*/ });
const Divide = createToken({ name: "Divide", pattern: /\// });
const Caret = createToken({ name: "Caret", pattern: /\^/ });
const Ampersand = createToken({ name: "Ampersand", pattern: /&/ });
const LParen = createToken({ name: "LParen", pattern: /\(/ });
const RParen = createToken({ name: "RParen", pattern: /\)/ });
const LBracket = createToken({ name: "LBracket", pattern: /\[/ });
const RBracket = createToken({ name: "RBracket", pattern: /\]/ });
const Comma = createToken({ name: "Comma", pattern: /,/ });
const Colon = createToken({ name: "Colon", pattern: /:/ });
const Dot = createToken({ name: "Dot", pattern: /\./ });

// 字面量
const DateLiteral = createToken({
  name: "DateLiteral",
  pattern: /\d{1,2}\/\d{1,2}\/\d{4}/,
  line_breaks: false,
});
const NumberLiteral = createToken({
  name: "NumberLiteral",
  pattern: /\d+(\.\d+)?/,
});
const StringLiteral = createToken({
  name: "StringLiteral",
  pattern: /"(?:[^"\\]|\\.)*"/,
});
const CharLiteral = createToken({
  name: "CharLiteral",
  pattern: /'(?:[^'\\]|\\.)*'/,
});
const Identifier = createToken({
  name: "Identifier",
  pattern: /[a-zA-Z_][a-zA-Z0-9_]*/,
});

// 空白与注释（忽略）
const WhiteSpace = createToken({
  name: "WhiteSpace",
  pattern: /[ \t]+/,
  group: Lexer.SKIPPED,
});
const Comment = createToken({
  name: "Comment",
  pattern: /\/\/[^\n]*/,
  group: Lexer.SKIPPED,
});
const NewLine = createToken({
  name: "NewLine",
  pattern: /\n/,
  group: Lexer.SKIPPED,
});

export const allTokens: TokenType[] = [
  // 关键字
  IF, THEN, ELSE, ENDIF, CASE, OF, OTHERWISE, ENDCASE, FOR, TO, STEP, NEXT,
  WHILE, DO, ENDWHILE, REPEAT, UNTIL, PROCEDURE, ENDPROCEDURE, FUNCTION,
  ENDFUNCTION, RETURNS, RETURN, CALL, DECLARE, CONSTANT, INPUT, OUTPUT, PRINT,
  AND, OR, NOT, TRUE, FALSE, OPENFILE, READFILE, WRITEFILE, CLOSEFILE,
  SEEK, GETRECORD, PUTRECORD, READ, WRITE, APPEND, TYPE, ENDTYPE, DEFINE, SET,
  CLASS, ENDCLASS, INHERITS, NEW, SUPER, PUBLIC, PRIVATE, BYREF, BYVAL, ARRAY,
  INTEGER, REAL, CHAR, STRING, BOOLEAN, DATE,
  // 运算符 / 标点
  AssignArrow, Equal, Ne, Le, Ge, Lt, Gt, Plus, Minus, Multiply, Divide, Caret,
  Ampersand, LParen, RParen, LBracket, RBracket, Comma, Colon, Dot,
  // 字面量
  DateLiteral, NumberLiteral, StringLiteral, CharLiteral, Identifier,
  // 忽略
  WhiteSpace, Comment, NewLine,
];

// 关键字 token 导出（供各方言 parser 引用）
export const keywordTokens = {
  IF, THEN, ELSE, ENDIF, CASE, OF, OTHERWISE, ENDCASE, FOR, TO, STEP, NEXT,
  WHILE, DO, ENDWHILE, REPEAT, UNTIL, PROCEDURE, ENDPROCEDURE, FUNCTION,
  ENDFUNCTION, RETURNS, RETURN, CALL, DECLARE, CONSTANT, INPUT, OUTPUT, PRINT,
  AND, OR, NOT, TRUE, FALSE, OPENFILE, READFILE, WRITEFILE, CLOSEFILE,
  SEEK, GETRECORD, PUTRECORD, READ, WRITE, APPEND, TYPE, ENDTYPE, DEFINE, SET,
  CLASS, ENDCLASS, INHERITS, NEW, SUPER, PUBLIC, PRIVATE, BYREF, BYVAL, ARRAY,
  INTEGER, REAL, CHAR, STRING, BOOLEAN, DATE,
};

export const operatorTokens = {
  AssignArrow, Equal, Ne, Le, Ge, Lt, Gt, Plus, Minus, Multiply, Divide, Caret,
  Ampersand, LParen, RParen, LBracket, RBracket, Comma, Colon, Dot,
};

export const literalTokens = {
  DateLiteral, NumberLiteral, StringLiteral, CharLiteral, Identifier,
};

export function makeLexer(tokens: TokenType[] = allTokens): Lexer {
  return new Lexer(tokens, {
    positionTracking: "onlyStart",
    ensureOptimizations: false,
  });
}
