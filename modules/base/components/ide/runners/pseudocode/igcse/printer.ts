/**
 * IGCSE (0478) 伪代码 printer：IR → IGCSE 伪代码。
 * 语法要点：CONSTANT x <- v、IF 换行 THEN、WHILE...DO、
 * DIV(a,b)/MOD(a,b) 函数式、SUBSTRING/ROUND/RANDOM。
 */
import { pseudoPrint, type PseudoStyle } from "../shared/pseudoGen";
import type { Program } from "../shared/ir";

const IGCSE_STYLE: PseudoStyle = {
  indent: 4,
  constantAssign: "arrow",
  ifThenSameLine: true,
  whileDo: true,
  procParens: false,
  otherColon: false,
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
    mid: "SUBSTRING",
    round: "ROUND",
    random: "RANDOM",
    rand: "RAND",
    int: "INT",
    eof: "EOF",
  },
  funcDivMod: true,
  date: (y, m, d) => `${pad(d)}/${pad(m)}/${y}`,
};

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function pseudoPrinterIgcse(program: Program): string {
  return pseudoPrint(program, IGCSE_STYLE);
}
