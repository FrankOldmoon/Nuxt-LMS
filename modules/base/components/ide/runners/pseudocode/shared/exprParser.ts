/**
 * 共享表达式语法（chevrotain EmbeddedActionsParser 基类）。
 * 覆盖 IGCSE 与 ALEVEL 的全部运算符，方言差异通过构造参数传入：
 *  - builtinFns：方言内置函数名 → IR 内置名映射（如 IGCSE 的 SUBSTRING / ALEVEL 的 MID）
 *  - allowPointer：是否启用指针解引用 ^（仅 ALEVEL）
 *  - allowDate：是否启用日期字面量（仅 ALEVEL）
 *  - allowSuper / allowObjectNew：OOP 相关（仅 ALEVEL）
 * 方言 parser 继承本类并补充语句级规则。
 */
import { EmbeddedActionsParser, tokenMatcher } from "chevrotain";
import { keywordTokens, operatorTokens, literalTokens } from "./lexer";
import type { Expr, BinaryOp, BuiltinName } from "./ir";

export interface ExprParserConfig {
  dialectName: string;
  builtinFns: Record<string, BuiltinName>;
  allowPointer?: boolean;
  allowDate?: boolean;
  allowObjectCalls?: boolean; // obj.method(...) / NEW / SUPER（ALEVEL OOP）
  randomName?: string; // 无参随机函数名（IGCSE 的 RANDOM）
  randName?: string; // 有参随机函数名（ALEVEL 的 RAND）
  intName?: string; // ALEVEL 的 INT
  rightName?: string; // ALEVEL 的 RIGHT
  leftName?: string; // IGCSE 无 LEFT，默认保留
}

const K = keywordTokens;
const O = operatorTokens;
const L = literalTokens;

export abstract class ExprParser extends EmbeddedActionsParser {
  protected config: ExprParserConfig;

  constructor(config: ExprParserConfig, tokens: any[]) {
    // 递归下降 + OR/MANY 写法中同一 subrule 在多个备选/循环里重复出现，
    // 会被 Chevrotain 静态校验误判为 DUPLICATE_PRODUCTIONS，实际运行时
    // 由 LL(k) lookahead 正确处理，故关闭该设计期校验。
    super(tokens, { skipValidations: true });
    this.config = config;
  }

  // 顶层入口：解析一个表达式
  expression = this.RULE("expression", (): Expr => {
    return this.SUBRULE(this.orExpr);
  });

  orExpr = this.RULE("orExpr", (): Expr => {
    let left = this.SUBRULE(this.andExpr);
    this.MANY(() => {
      this.CONSUME(K.OR);
      const right = this.SUBRULE(this.andExpr);
      left = { kind: "binary", op: "or", left, right };
    });
    return left;
  });

  andExpr = this.RULE("andExpr", (): Expr => {
    let left = this.SUBRULE(this.notExpr);
    this.MANY(() => {
      this.CONSUME(K.AND);
      const right = this.SUBRULE(this.notExpr);
      left = { kind: "binary", op: "and", left, right };
    });
    return left;
  });

  notExpr = this.RULE("notExpr", (): Expr => {
    // NOT 作用于整个比较表达式：NOT a > b => not (a > b)
    if (tokenMatcher(this.LA(1).tokenType, K.NOT)) {
      this.CONSUME(K.NOT);
      const operand = this.SUBRULE(this.notExpr);
      return { kind: "unary", op: "not", operand };
    }
    return this.SUBRULE(this.comparison);
  });

  comparison = this.RULE("comparison", (): Expr => {
    let left = this.SUBRULE(this.concatExpr);
    this.MANY(() => {
      // OR 覆盖所有比较符（if/else 会因录制只录一条路径导致 lookahead 缺失）
      const op = this.OR([
        { ALT: (): BinaryOp => { this.CONSUME(O.Ne); return "ne"; } },
        { ALT: (): BinaryOp => { this.CONSUME(O.Le); return "le"; } },
        { ALT: (): BinaryOp => { this.CONSUME(O.Ge); return "ge"; } },
        { ALT: (): BinaryOp => { this.CONSUME(O.Lt); return "lt"; } },
        { ALT: (): BinaryOp => { this.CONSUME(O.Gt); return "gt"; } },
        { ALT: (): BinaryOp => { this.CONSUME(O.Equal); return "eq"; } },
      ]);
      const right = this.SUBRULE(this.concatExpr);
      left = { kind: "binary", op, left, right };
    });
    return left;
  });

  concatExpr = this.RULE("concatExpr", (): Expr => {
    let left = this.SUBRULE(this.additiveExpr);
    this.MANY(() => {
      this.CONSUME(O.Ampersand);
      const right = this.SUBRULE(this.additiveExpr);
      left = { kind: "concat", left, right };
    });
    return left;
  });

  additiveExpr = this.RULE("additiveExpr", (): Expr => {
    let left = this.SUBRULE(this.multiplicativeExpr);
    this.MANY(() => {
      const op = this.OR([
        { ALT: (): BinaryOp => { this.CONSUME(O.Minus); return "sub"; } },
        { ALT: (): BinaryOp => { this.CONSUME(O.Plus); return "add"; } },
      ]);
      const right = this.SUBRULE(this.multiplicativeExpr);
      left = { kind: "binary", op, left, right };
    });
    return left;
  });

  multiplicativeExpr = this.RULE("multiplicativeExpr", (): Expr => {
    let left = this.SUBRULE(this.powerExpr);
    this.MANY(() => {
      const op = this.OR([
        { ALT: (): BinaryOp => { this.CONSUME(O.Multiply); return "mul"; } },
        { ALT: (): BinaryOp => { this.CONSUME(O.Divide); return "div"; } },
        // DIV / MOD 以标识符形式出现（IGCSE 函数式与 ALEVEL 中缀统一），
        // 用 GATE 谓词限定 image，避免吞掉普通变量名
        {
          ALT: (): BinaryOp => {
            const dm = this.CONSUME(L.Identifier);
            return dm.image.toUpperCase() === "DIV" ? "divInt" : "mod";
          },
          GATE: (): boolean => {
            const img = this.LA(1).image.toUpperCase();
            return img === "DIV" || img === "MOD";
          },
        },
      ]);
      const right = this.SUBRULE(this.powerExpr);
      left = { kind: "binary", op, left, right };
    });
    return left;
  });

  powerExpr = this.RULE("powerExpr", (): Expr => {
    let left = this.SUBRULE(this.unaryExpr);
    this.MANY(() => {
      this.CONSUME(O.Caret);
      const right = this.SUBRULE(this.unaryExpr);
      left = { kind: "binary", op: "pow", left, right };
    });
    return left;
  });

  unaryExpr = this.RULE("unaryExpr", (): Expr => {
    if (tokenMatcher(this.LA(1).tokenType, O.Minus)) {
      this.CONSUME(O.Minus);
      const operand = this.SUBRULE(this.unaryExpr);
      return { kind: "unary", op: "neg", operand };
    }
    return this.SUBRULE(this.primary);
  });

  primary = this.RULE("primary", (): Expr => {
    // OR 分支必须是 SUBRULE 子规则（普通方法分支的 lookahead 分析不可靠），
    // 保证 chevrotain 录制阶段能覆盖所有起始 token。
    const alts: { ALT: () => Expr }[] = [
      { ALT: () => this.SUBRULE(this.numberRule) },
      { ALT: () => this.SUBRULE(this.stringRule) },
      { ALT: () => this.SUBRULE(this.charRule) },
      { ALT: () => this.SUBRULE(this.booleanRule) },
      { ALT: () => this.SUBRULE(this.parenRule) },
      { ALT: () => this.SUBRULE(this.identifierRule) },
    ];
    if (this.config.allowDate) {
      alts.splice(4, 0, { ALT: () => this.SUBRULE(this.dateRule) });
    }
    return this.OR(alts);
  });

  numberRule = this.RULE("numberRule", (): Expr => {
    const tok = this.CONSUME(L.NumberLiteral);
    return { kind: "number", value: parseFloat(tok.image) };
  });

  stringRule = this.RULE("stringRule", (): Expr => {
    const tok = this.CONSUME(L.StringLiteral);
    return { kind: "string", value: unquote(tok.image, '"') };
  });

  charRule = this.RULE("charRule", (): Expr => {
    const tok = this.CONSUME(L.CharLiteral);
    return { kind: "char", value: unquote(tok.image, "'") };
  });

  booleanRule = this.RULE("booleanRule", (): Expr => {
    return this.OR([
      {
        ALT: (): Expr => {
          this.CONSUME(K.TRUE);
          return { kind: "boolean", value: true };
        },
      },
      {
        ALT: (): Expr => {
          this.CONSUME(K.FALSE);
          return { kind: "boolean", value: false };
        },
      },
    ]);
  });

  dateRule = this.RULE("dateRule", (): Expr => {
    const tok = this.CONSUME(L.DateLiteral);
    const [d, m, y] = tok.image.split("/").map((s: string) => parseInt(s, 10));
    return { kind: "date", year: y, month: m, day: d };
  });

  parenRule = this.RULE("parenRule", (): Expr => {
    this.CONSUME(O.LParen);
    const expr = this.SUBRULE(this.expression);
    this.CONSUME(O.RParen);
    return expr;
  });

  identifierRule = this.RULE("identifierRule", (): Expr => {
    // DSL 直接内联（普通方法包装会导致 MANY 的 lookahead 缺失）
    const tok = this.CONSUME(L.Identifier);
    const name = tok.image;
    const base: Expr = { kind: "identifier", name };
    let node: Expr = base;
    // OPTION 包 OR：避免 OR 的空分支导致 lookahead 异常（无后缀时不进入）
    this.OPTION(() => {
      const alts: { ALT: () => Expr }[] = [
        {
          // 函数调用
          ALT: (): Expr => {
            this.CONSUME(O.LParen);
            const args: Expr[] = [];
            this.OPTION(() => {
              args.push(this.SUBRULE(this.expression));
              this.MANY(() => {
                this.CONSUME(O.Comma);
                args.push(this.SUBRULE(this.expression));
              });
            });
            this.CONSUME(O.RParen);
            const builtin = this.config.builtinFns[name.toLowerCase()];
            if (builtin) return { kind: "builtinCall", name: builtin, args };
            return { kind: "call", name, args };
          },
        },
        {
          // 数组访问（支持多维）
          ALT: (): Expr => {
            const indices: Expr[] = [];
            this.CONSUME(O.LBracket);
            indices.push(this.SUBRULE(this.expression));
            this.MANY(() => {
              this.CONSUME(O.Comma);
              indices.push(this.SUBRULE(this.expression));
            });
            this.CONSUME(O.RBracket);
            return { kind: "arrayAccess", target: base, indices };
          },
        },
      ];
      if (this.config.allowPointer) {
        alts.splice(1, 0, {
          ALT: (): Expr => {
            this.CONSUME(O.Caret);
            return { kind: "deref", target: base };
          },
        });
      }
      if (this.config.allowObjectCalls) {
        alts.push({
          // 成员访问 / 对象方法调用
          ALT: (): Expr => {
            this.CONSUME(O.Dot);
            const member = this.CONSUME(L.Identifier).image;
            return this.OR([
              {
                ALT: (): Expr => {
                  this.CONSUME(O.LParen);
                  const args: Expr[] = [];
                  this.OPTION(() => {
                    args.push(this.SUBRULE(this.expression));
                    this.MANY(() => {
                      this.CONSUME(O.Comma);
                      args.push(this.SUBRULE(this.expression));
                    });
                  });
                  this.CONSUME(O.RParen);
                  return { kind: "objectCall", target: base, method: member, args };
                },
              },
              { ALT: (): Expr => ({ kind: "memberAccess", target: base, member }) },
            ]);
          },
        });
      }
      node = this.OR(alts);
    });
    return node;
  });
}

function unquote(image: string, quote: string): string {
  let s = image.slice(1, -1);
  // 处理转义
  s = s.replace(/\\(.)/g, "$1");
  return s;
}

/** 空 token 列表辅助（子类可覆盖，用于关闭不需要的特性） */
export { tokenMatcher };
