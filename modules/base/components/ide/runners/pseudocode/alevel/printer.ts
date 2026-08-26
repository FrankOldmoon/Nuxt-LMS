/**
 * ALEVEL (9618) 伪代码 printer：IR → ALEVEL 伪代码。
 * 语法要点：CONSTANT x = v、IF...THEN 同行、WHILE 无 DO、
 * 中缀 DIV/MOD、过程/函数恒带括号、OTHERWISE : 带冒号、
 * RIGHT/MID/INT/RAND、3 空格缩进。
 */
import { pseudoPrint, type PseudoStyle } from "../shared/pseudoGen";
import type { Program } from "../shared/ir";

const ALEVEL_STYLE: PseudoStyle = {
  indent: 3,
  constantAssign: "equal",
  ifThenSameLine: true,
  whileDo: false,
  procParens: true,
  otherColon: true,
  divIntOp: "DIV",
  modOp: "MOD",
  powOp: "^",
  concatOp: "&",
  eqOp: "=",
  neOp: "<>",
  andOp: "AND",
  orOp: "OR",
  notOp: "NOT",
  boolTrue: "TRUE",
  boolFalse: "FALSE",
  builtinNames: {
    length: "LENGTH",
    lcase: "LCASE",
    ucase: "UCASE",
    substring: "SUBSTRING",
    mid: "MID",
    right: "RIGHT",
    int: "INT",
    rand: "RAND",
    eof: "EOF",
  },
  funcDivMod: false,
  date: (y, m, d) => `${pad(d)}/${pad(m)}/${y}`,
};

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function pseudoPrinterAlevel(program: Program): string {
  return pseudoPrint(program, ALEVEL_STYLE);
}
