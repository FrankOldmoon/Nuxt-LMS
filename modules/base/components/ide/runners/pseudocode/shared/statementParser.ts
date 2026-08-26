/**
 * 共享行内语句解析器基类（chevrotain EmbeddedActionsParser）。
 * 把"一行"伪代码解析成结构化 LineAST，块结构由块树提供。
 * IGCSE / ALEVEL 的语句形态差异通过 StatementConfig 参数化：
 *  - constantAssign：常量赋值符号（IGCSE `<-` / ALEVEL `=`）
 *  - allowOop / allowTypeSystem / allowPointer / allowDate
 * 方言 parser 继承本类，仅注入各自配置。
 *
 * 注意：所有 DSL 调用（CONSUME/SUBRULE/OR/MANY/OPTION...）必须**直接**出现在
 * RULE 实现内。chevrotain 录制阶段不会追踪"普通方法"内部的 DSL，
 * 因此普通方法包装会导致 OR/MANY 的 lookahead 函数缺失（运行时访问
 * currRuleLookaheadFuncs 报错）。
 */
import { tokenMatcher, EOF } from "chevrotain";
import { ExprParser, type ExprParserConfig } from "./exprParser";
import { keywordTokens, operatorTokens, literalTokens } from "./lexer";
import type { Expr, Param, DataType, Stmt, FileMode } from "./ir";

const K = keywordTokens;
const O = operatorTokens;
const L = literalTokens;

/** 块头行 / 普通行的解析结果 */
export type LineAST =
  | { kind: "if"; cond: Expr }
  | { kind: "while"; cond: Expr }
  | { kind: "for"; variable: string; from: Expr; to: Expr; step: Expr | null }
  | { kind: "repeat" }
  | {
      kind: "procedure";
      name: string;
      params: Param[];
      visibility?: "PUBLIC" | "PRIVATE";
    }
  | {
      kind: "function";
      name: string;
      params: Param[];
      returnType: DataType;
      visibility?: "PUBLIC" | "PRIVATE";
    }
  | { kind: "case"; subject: Expr }
  | { kind: "typeEnum"; name: string; values: string[] }
  | { kind: "typePointer"; name: string; elem: DataType }
  | { kind: "typeSet"; name: string; elem: DataType }
  | { kind: "typeRecord"; name: string }
  | { kind: "classHeader"; name: string; inherits: string | null }
  | { kind: "classField"; name: string; type: DataType; visibility: "PUBLIC" | "PRIVATE" }
  | { kind: "define"; name: string; values: Expr[]; typeName: string }
  | { kind: "stmt"; stmt: Stmt };

export interface StatementConfig extends ExprParserConfig {
  constantAssign: "arrow" | "equal";
  allowTypeSystem?: boolean; // TYPE/DEFINE/SET（ALEVEL）
  allowOop?: boolean; // CLASS/NEW/SUPER（ALEVEL）
  procNoParens?: boolean; // 无参过程/函数可不带括号（IGCSE：PROCEDURE Name / FUNCTION Name）
}

export abstract class StatementParser extends ExprParser {
  protected sconfig: StatementConfig;

  constructor(config: StatementConfig, tokens: any[]) {
    super(config, tokens);
    this.sconfig = config;
  }

  /** 解析一行 → LineAST */
  line = this.RULE("line", (): LineAST => {
    return this.SUBRULE(this.statement);
  });

  statement = this.RULE("statement", (): LineAST => {
    // OR 分支必须是 SUBRULE 子规则（普通方法分支的 lookahead 分析不可靠）
    const alts: { ALT: () => LineAST }[] = [
      { ALT: () => this.SUBRULE(this.assignmentRule) },
      { ALT: () => this.SUBRULE(this.outputRule) },
      { ALT: () => this.SUBRULE(this.inputRule) },
      { ALT: () => this.SUBRULE(this.declareRule) },
      { ALT: () => this.SUBRULE(this.constantRule) },
      { ALT: () => this.SUBRULE(this.callRule) },
      { ALT: () => this.SUBRULE(this.returnRule) },
      { ALT: () => this.SUBRULE(this.fileOpRule) },
      { ALT: () => this.SUBRULE(this.ifRule) },
      { ALT: () => this.SUBRULE(this.whileRule) },
      { ALT: () => this.SUBRULE(this.forRule) },
      { ALT: () => this.SUBRULE(this.repeatRule) },
      { ALT: () => this.SUBRULE(this.procedureRule) },
      { ALT: () => this.SUBRULE(this.functionRule) },
      { ALT: () => this.SUBRULE(this.caseRule) },
      { ALT: () => this.SUBRULE(this.typeRule) },
      { ALT: () => this.SUBRULE(this.classRule) },
      { ALT: () => this.SUBRULE(this.defineStmtRule) },
    ];
    if (this.sconfig.allowOop) {
      alts.push({ ALT: () => this.SUBRULE(this.classMemberRule) });
    }
    return this.OR(alts);
  });

  // ---------- 赋值 ----------
  assignmentRule = this.RULE("assignmentRule", (): LineAST => {
    const target = this.SUBRULE(this.lvalue);
    this.OR([
      { ALT: () => this.CONSUME(O.AssignArrow) },
      { ALT: () => this.CONSUME(O.Equal) }, // 容错：= 赋值
    ]);
    const value = this.SUBRULE(this.expression);
    return { kind: "stmt", stmt: { kind: "assign", target, value } };
  });

  // ---------- 输出 ----------
  outputRule = this.RULE("outputRule", (): LineAST => {
    this.OR([
      { ALT: () => this.CONSUME(K.OUTPUT) },
      { ALT: () => this.CONSUME(K.PRINT) },
    ]);
    const values: Expr[] = [];
    // OPTION 保证录制覆盖（if(LA) 条件在录制阶段恒为 false，会漏录 MANY）
    this.OPTION(() => {
      values.push(this.SUBRULE(this.expression));
      this.MANY(() => {
        this.CONSUME(O.Comma);
        values.push(this.SUBRULE(this.expression));
      });
    });
    return { kind: "stmt", stmt: { kind: "output", values } };
  });

  // ---------- 输入 ----------
  inputRule = this.RULE("inputRule", (): LineAST => {
    this.CONSUME(K.INPUT);
    const targets: Expr[] = [];
    this.OPTION(() => {
      targets.push(this.SUBRULE(this.lvalue));
      this.MANY(() => {
        this.CONSUME(O.Comma);
        targets.push(this.SUBRULE(this.lvalue));
      });
    });
    return { kind: "stmt", stmt: { kind: "input", targets } };
  });

  // ---------- 声明 ----------
  declareRule = this.RULE("declareRule", (): LineAST => {
    this.CONSUME(K.DECLARE);
    const name = this.CONSUME(L.Identifier).image;
    this.CONSUME(O.Colon);
    const type = this.SUBRULE(this.dataType);
    return { kind: "stmt", stmt: { kind: "declare", name, type } };
  });

  // ---------- 常量 ----------
  constantRule = this.RULE("constantRule", (): LineAST => {
    this.CONSUME(K.CONSTANT);
    const name = this.CONSUME(L.Identifier).image;
    if (this.sconfig.constantAssign === "equal") {
      this.CONSUME(O.Equal);
    } else {
      this.CONSUME(O.AssignArrow);
    }
    const value = this.SUBRULE(this.expression);
    return { kind: "stmt", stmt: { kind: "const", name, value } };
  });

  // ---------- 调用 ----------
  callRule = this.RULE("callRule", (): LineAST => {
    this.CONSUME(K.CALL);
    const name = this.CONSUME(L.Identifier).image;
    const args: Expr[] = [];
    this.OPTION(() => {
      this.CONSUME(O.LParen);
      this.OPTION(() => {
        args.push(this.SUBRULE(this.expression));
        this.MANY(() => {
          this.CONSUME(O.Comma);
          args.push(this.SUBRULE(this.expression));
        });
      });
      this.CONSUME(O.RParen);
    });
    return { kind: "stmt", stmt: { kind: "call", name, args } };
  });

  // ---------- 返回 ----------
  returnRule = this.RULE("returnRule", (): LineAST => {
    this.CONSUME(K.RETURN);
    let value: Expr | null = null;
    this.OPTION(() => {
      value = this.SUBRULE(this.expression);
    });
    return { kind: "stmt", stmt: { kind: "return", value } };
  });

  // ---------- 文件操作 ----------
  fileOpRule = this.RULE("fileOpRule", (): LineAST => {
    return this.OR([
      { ALT: () => this.SUBRULE(this.fileOpenRule) },
      { ALT: () => this.SUBRULE(this.fileReadRule) },
      { ALT: () => this.SUBRULE(this.fileWriteRule) },
      { ALT: () => this.SUBRULE(this.fileCloseRule) },
      { ALT: () => this.SUBRULE(this.fileSeekRule) },
      { ALT: () => this.SUBRULE(this.fileGetRule) },
      { ALT: () => this.SUBRULE(this.filePutRule) },
    ]);
  });

  fileOpenRule = this.RULE("fileOpenRule", (): LineAST => {
    this.CONSUME(K.OPENFILE);
    const file = this.SUBRULE(this.expression);
    let mode: FileMode = "READ";
    this.OPTION(() => {
      this.CONSUME(K.FOR);
      mode = this.OR([
        { ALT: (): FileMode => { this.CONSUME(K.READ); return "READ"; } },
        { ALT: (): FileMode => { this.CONSUME(K.WRITE); return "WRITE"; } },
        { ALT: (): FileMode => { this.CONSUME(K.APPEND); return "APPEND"; } },
        // RANDOM 作为标识符（保留字冲突处理）
        { ALT: (): FileMode => { this.CONSUME(L.Identifier); return "RANDOM"; } },
      ]);
    });
    return { kind: "stmt", stmt: { kind: "fileOp", op: "open", file, mode } };
  });

  fileReadRule = this.RULE("fileReadRule", (): LineAST => {
    this.CONSUME(K.READFILE);
    const file = this.SUBRULE(this.expression);
    this.CONSUME(O.Comma);
    const target = this.SUBRULE(this.lvalue);
    return { kind: "stmt", stmt: { kind: "fileOp", op: "read", file, target } };
  });

  fileWriteRule = this.RULE("fileWriteRule", (): LineAST => {
    this.CONSUME(K.WRITEFILE);
    const file = this.SUBRULE(this.expression);
    this.CONSUME(O.Comma);
    const data = this.SUBRULE(this.expression);
    return { kind: "stmt", stmt: { kind: "fileOp", op: "write", file, data } };
  });

  fileCloseRule = this.RULE("fileCloseRule", (): LineAST => {
    this.CONSUME(K.CLOSEFILE);
    const file = this.SUBRULE(this.expression);
    return { kind: "stmt", stmt: { kind: "fileOp", op: "close", file } };
  });

  fileSeekRule = this.RULE("fileSeekRule", (): LineAST => {
    this.CONSUME(K.SEEK);
    const file = this.SUBRULE(this.expression);
    this.CONSUME(O.Comma);
    const address = this.SUBRULE(this.expression);
    return { kind: "stmt", stmt: { kind: "fileOp", op: "seek", file, address } };
  });

  fileGetRule = this.RULE("fileGetRule", (): LineAST => {
    this.CONSUME(K.GETRECORD);
    const file = this.SUBRULE(this.expression);
    this.CONSUME(O.Comma);
    const target = this.SUBRULE(this.lvalue);
    return { kind: "stmt", stmt: { kind: "fileOp", op: "get", file, target } };
  });

  filePutRule = this.RULE("filePutRule", (): LineAST => {
    this.CONSUME(K.PUTRECORD);
    const file = this.SUBRULE(this.expression);
    this.CONSUME(O.Comma);
    const data = this.SUBRULE(this.expression);
    return { kind: "stmt", stmt: { kind: "fileOp", op: "put", file, data } };
  });

  // ---------- IF 头 ----------
  ifRule = this.RULE("ifRule", (): LineAST => {
    this.CONSUME(K.IF);
    const cond = this.SUBRULE(this.expression);
    // IGCSE: IF cond (单独 THEN 行已被块解析器跳过) / ALEVEL: IF cond THEN
    this.OPTION(() => {
      this.CONSUME(K.THEN);
    });
    return { kind: "if", cond };
  });

  // ---------- WHILE 头 ----------
  whileRule = this.RULE("whileRule", (): LineAST => {
    this.CONSUME(K.WHILE);
    const cond = this.SUBRULE(this.expression);
    this.OPTION(() => {
      this.CONSUME(K.DO);
    });
    return { kind: "while", cond };
  });

  // ---------- FOR 头 ----------
  forRule = this.RULE("forRule", (): LineAST => {
    this.CONSUME(K.FOR);
    const variable = this.CONSUME(L.Identifier).image;
    // FOR 循环赋值符号两方言规范均用 ←（兼容 = 写法）
    this.OR([
      { ALT: () => this.CONSUME(O.AssignArrow) },
      { ALT: () => this.CONSUME(O.Equal) },
    ]);
    const from = this.SUBRULE(this.expression);
    this.CONSUME(K.TO);
    const to = this.SUBRULE(this.expression);
    let step: Expr | null = null;
    this.OPTION(() => {
      this.CONSUME(K.STEP);
      step = this.SUBRULE(this.expression);
    });
    return { kind: "for", variable, from, to, step };
  });

  // ---------- REPEAT 头 ----------
  repeatRule = this.RULE("repeatRule", (): LineAST => {
    this.CONSUME(K.REPEAT);
    return { kind: "repeat" };
  });

  // ---------- PROCEDURE 头 ----------
  procedureRule = this.RULE("procedureRule", (): LineAST => {
    this.CONSUME(K.PROCEDURE);
    const name = this.CONSUME(L.Identifier).image;
    let params: Param[] = [];
    let hadParens = false;
    this.OPTION(() => {
      hadParens = true;
      params = this.SUBRULE(this.paramListRule);
    });
    if (!this.sconfig.procNoParens && !hadParens && !this.RECORDING_PHASE) {
      throw new Error("缺少左括号");
    }
    return { kind: "procedure", name, params };
  });

  // ---------- FUNCTION 头 ----------
  functionRule = this.RULE("functionRule", (): LineAST => {
    this.CONSUME(K.FUNCTION);
    const name = this.CONSUME(L.Identifier).image;
    let params: Param[] = [];
    let returnType: DataType = "INTEGER";
    let hadParens = false;
    // OPTION 嵌套在 FUNCTION 场景有 lookahead 异常，改用
    // RECORDING_PHASE 保护的 if（录制时强制进入以覆盖参数列表路径）
    if (this.RECORDING_PHASE || tokenMatcher(this.LA(1).tokenType, O.LParen)) {
      hadParens = true;
      params = this.SUBRULE(this.paramListRule);
      this.OPTION(() => {
        this.OR([
          { ALT: () => this.CONSUME(K.RETURNS) },
          { ALT: () => this.CONSUME(K.RETURN) },
        ]);
        returnType = this.SUBRULE(this.dataType);
      });
    }
    if (!this.sconfig.procNoParens && !hadParens && !this.RECORDING_PHASE) {
      throw new Error("缺少左括号");
    }
    return { kind: "function", name, params, returnType };
  });

  // ---------- 参数列表（过程/函数共用，强制括号；外层用 OPTION 控制可选） ----------
  paramListRule = this.RULE("paramListRule", (): Param[] => {
    const params: Param[] = [];
    this.CONSUME(O.LParen);
    this.OPTION(() => {
      params.push(this.SUBRULE(this.paramRule));
      this.MANY(() => {
        this.CONSUME(O.Comma);
        params.push(this.SUBRULE(this.paramRule));
      });
    });
    this.CONSUME(O.RParen);
    return params;
  });

  paramRule = this.RULE("paramRule", (): Param => {
    // BYREF/BYVAL 用 OPTION+OR（if(LA) 录制只录一条路径，会漏 BYREF/BYVAL 起始）
    let byRef = false;
    this.OPTION(() => {
      byRef = this.OR([
        { ALT: (): boolean => { this.CONSUME(K.BYREF); return true; } },
        { ALT: (): boolean => { this.CONSUME(K.BYVAL); return false; } },
      ]);
    });
    const name = this.CONSUME(L.Identifier).image;
    this.CONSUME(O.Colon);
    const type = this.SUBRULE(this.dataType);
    return { name, type, byRef };
  });

  // ---------- CASE 头 ----------
  caseRule = this.RULE("caseRule", (): LineAST => {
    this.CONSUME(K.CASE);
    this.CONSUME(K.OF);
    const subject = this.SUBRULE(this.expression);
    return { kind: "case", subject };
  });

  // ---------- TYPE 头 ----------
  typeRule = this.RULE("typeRule", (): LineAST => {
    this.CONSUME(K.TYPE);
    const name = this.CONSUME(L.Identifier).image;
    // 默认 RECORD 头
    let result: LineAST = { kind: "typeRecord", name };
    this.OPTION(() => {
      this.CONSUME(O.Equal);
      result = this.OR([
        // TYPE x = (枚举)
        {
          ALT: (): LineAST => {
            this.CONSUME(O.LParen);
            const values: string[] = [];
            values.push(this.CONSUME(L.Identifier).image);
            this.MANY(() => {
              this.CONSUME(O.Comma);
              values.push(this.CONSUME(L.Identifier).image);
            });
            this.CONSUME(O.RParen);
            return { kind: "typeEnum", name, values };
          },
        },
        // TYPE x = SET OF type
        {
          ALT: (): LineAST => {
            this.CONSUME(K.SET);
            this.CONSUME(K.OF);
            const elem = this.SUBRULE(this.dataType);
            return { kind: "typeSet", name, elem };
          },
        },
        // TYPE x = ^type
        {
          ALT: (): LineAST => {
            this.CONSUME(O.Caret);
            const elem = this.SUBRULE(this.dataType);
            return { kind: "typePointer", name, elem };
          },
        },
        // 其他形式：TYPE x = ... 递归数据类型（Record 别名）
        {
          ALT: (): LineAST => {
            const elem = this.SUBRULE(this.dataType);
            return { kind: "typePointer", name, elem } as LineAST;
          },
        },
      ]);
    });
    return result;
  });

  // ---------- CLASS 头 ----------
  classRule = this.RULE("classRule", (): LineAST => {
    this.CONSUME(K.CLASS);
    const name = this.CONSUME(L.Identifier).image;
    let inherits: string | null = null;
    this.OPTION(() => {
      this.CONSUME(K.INHERITS);
      inherits = this.CONSUME(L.Identifier).image;
    });
    return { kind: "classHeader", name, inherits };
  });

  // ---------- DEFINE（集合字面量） ----------
  // 注意：RULE 名不能是 "defineRule"（会覆盖 chevrotain 的 defineRule 方法）
  defineStmtRule = this.RULE("defineStmtRule", (): LineAST => {
    this.CONSUME(K.DEFINE);
    const name = this.CONSUME(L.Identifier).image;
    this.CONSUME(O.LParen);
    const values: Expr[] = [];
    if (!tokenMatcher(this.LA(1).tokenType, O.RParen)) {
      values.push(this.SUBRULE(this.expression));
      this.MANY(() => {
        this.CONSUME(O.Comma);
        values.push(this.SUBRULE(this.expression));
      });
    }
    this.CONSUME(O.RParen);
    this.CONSUME(O.Colon);
    const typeName = this.CONSUME(L.Identifier).image;
    return { kind: "define", name, values, typeName };
  });

  // ---------- CLASS 成员行（PRIVATE/PUBLIC 前缀） ----------
  classMemberRule = this.RULE("classMemberRule", (): LineAST => {
    const isPrivate = tokenMatcher(this.LA(1).tokenType, K.PRIVATE);
    this.OR([
      { ALT: () => this.CONSUME(K.PRIVATE) },
      { ALT: () => this.CONSUME(K.PUBLIC) },
    ]);
    const visibility: "PUBLIC" | "PRIVATE" = isPrivate ? "PRIVATE" : "PUBLIC";
    if (tokenMatcher(this.LA(1).tokenType, K.PROCEDURE)) {
      const p = this.SUBRULE(this.procedureRule) as unknown as {
        kind: "procedure";
        name: string;
        params: Param[];
      };
      return { ...p, visibility } as LineAST;
    }
    if (tokenMatcher(this.LA(1).tokenType, K.FUNCTION)) {
      const f = this.SUBRULE(this.functionRule) as unknown as {
        kind: "function";
        name: string;
        params: Param[];
        returnType: DataType;
      };
      return { ...f, visibility } as LineAST;
    }
    // 字段：PRIVATE Name : STRING
    const name = this.CONSUME(L.Identifier).image;
    this.CONSUME(O.Colon);
    const type = this.SUBRULE(this.dataType);
    return { kind: "classField", name, type, visibility } as LineAST;
  });

  // ---------- 可赋值目标：标识符 / 数组 / 成员 / 解引用 ----------
  lvalue = this.RULE("lvalue", (): Expr => {
    const name = this.CONSUME(L.Identifier).image;
    const base: Expr = { kind: "identifier", name };
    let node: Expr = base;
    // OPTION 包 OR：避免 OR 空分支导致 lookahead 异常（无后缀时不进入）
    this.OPTION(() => {
      const alts: { ALT: () => Expr }[] = [
        {
          // 数组访问
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
        alts.push({
          // 指针解引用
          ALT: (): Expr => {
            this.CONSUME(O.Caret);
            return { kind: "deref", target: base };
          },
        });
      }
      alts.push({
        // 成员访问
        ALT: (): Expr => {
          this.CONSUME(O.Dot);
          const member = this.CONSUME(L.Identifier).image;
          return { kind: "memberAccess", target: base, member };
        },
      });
      node = this.OR(alts);
    });
    return node;
  });

  // ---------- 数据类型 ----------
  dataType = this.RULE("dataType", (): DataType => {
    const alts: { ALT: () => DataType }[] = [
      { ALT: () => this.SUBRULE(this.dataTypeArrayRule) },
      { ALT: (): DataType => { this.CONSUME(K.INTEGER); return "INTEGER"; } },
      { ALT: (): DataType => { this.CONSUME(K.REAL); return "REAL"; } },
      { ALT: (): DataType => { this.CONSUME(K.CHAR); return "CHAR"; } },
      { ALT: (): DataType => { this.CONSUME(K.STRING); return "STRING"; } },
      { ALT: (): DataType => { this.CONSUME(K.BOOLEAN); return "BOOLEAN"; } },
      { ALT: () => this.SUBRULE(this.dataTypeUserRule) },
    ];
    if (this.config.allowPointer) {
      alts.splice(1, 0, { ALT: () => this.SUBRULE(this.dataTypePointerRule) });
    }
    if (this.config.allowDate) {
      alts.push({ ALT: (): DataType => { this.CONSUME(K.DATE); return "DATE"; } });
    }
    return this.OR(alts);
  });

  dataTypeArrayRule = this.RULE("dataTypeArrayRule", (): DataType => {
    this.CONSUME(K.ARRAY);
    this.CONSUME(O.LBracket);
    const dims: { low: Expr; high: Expr }[] = [];
    dims.push(this.SUBRULE(this.dimRule));
    this.MANY(() => {
      this.CONSUME(O.Comma);
      dims.push(this.SUBRULE(this.dimRule));
    });
    this.CONSUME(O.RBracket);
    this.CONSUME(K.OF);
    const elem = this.SUBRULE(this.dataType);
    return { kind: "array", dims, elem };
  });

  dimRule = this.RULE("dimRule", (): { low: Expr; high: Expr } => {
    const high = this.SUBRULE(this.expression);
    const one: Expr = { kind: "number", value: 1 };
    let result: { low: Expr; high: Expr } = { low: one, high };
    this.OPTION(() => {
      this.CONSUME(O.Colon);
      const upper = this.SUBRULE(this.expression);
      result = { low: high, high: upper };
    });
    return result;
  });

  dataTypePointerRule = this.RULE("dataTypePointerRule", (): DataType => {
    this.CONSUME(O.Caret);
    const elem = this.SUBRULE(this.dataType);
    return { kind: "pointer", elem };
  });

  dataTypeUserRule = this.RULE("dataTypeUserRule", (): DataType => {
    const name = this.CONSUME(L.Identifier).image;
    return { kind: "user", name };
  });

  protected endOfLine(): boolean {
    return this.LA(1).tokenType === undefined || this.LA(1).tokenType === EOF;
  }
}
