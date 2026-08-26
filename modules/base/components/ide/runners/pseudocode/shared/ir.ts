/**
 * 方言无关的统一中间表示（IR）。
 * IGCSE / ALEVEL 伪代码与 Python 子集都先解析成 IR，
 * 再由各方言的 printer 输出目标代码。语法层面的差异只出现在
 * parser（前端）与 printer（后端），IR 本身只保留语义。
 */

// ---------------- 数据类型 ----------------

export type PrimitiveType =
  | "INTEGER"
  | "REAL"
  | "CHAR"
  | "STRING"
  | "BOOLEAN"
  | "DATE";

export type DataType =
  | PrimitiveType
  | { kind: "array"; dims: { low: Expr; high: Expr }[]; elem: DataType }
  | { kind: "user"; name: string }
  | { kind: "pointer"; elem: DataType };

// ---------------- 表达式 ----------------

export type BinaryOp =
  | "add"
  | "sub"
  | "mul"
  | "div" // 浮点除法 /
  | "divInt" // 整除 DIV / //
  | "mod" // 取模 MOD / %
  | "pow" // 幂 ^ / **
  | "eq"
  | "ne"
  | "lt"
  | "le"
  | "gt"
  | "ge"
  | "and"
  | "or";

export type BuiltinName =
  | "length"
  | "lcase"
  | "ucase"
  | "substring"
  | "mid"
  | "right"
  | "left"
  | "round"
  | "random"
  | "rand"
  | "int"
  | "eof";

export type Expr =
  | { kind: "number"; value: number }
  | { kind: "string"; value: string }
  | { kind: "char"; value: string }
  | { kind: "boolean"; value: boolean }
  | { kind: "date"; year: number; month: number; day: number }
  | { kind: "identifier"; name: string }
  | { kind: "arrayAccess"; target: Expr; indices: Expr[] }
  | { kind: "memberAccess"; target: Expr; member: string } // record.field
  | { kind: "deref"; target: Expr } // 指针解引用 ptr^
  | { kind: "binary"; op: BinaryOp; left: Expr; right: Expr }
  | { kind: "unary"; op: "not" | "neg"; operand: Expr }
  | { kind: "concat"; left: Expr; right: Expr } // 字符串拼接 &
  | { kind: "builtinCall"; name: BuiltinName; args: Expr[] }
  | { kind: "call"; name: string; args: Expr[] } // 用户函数调用
  | { kind: "objectCall"; target: Expr; method: string; args: Expr[] } // obj.method(...)
  | { kind: "objectNew"; className: string; args: Expr[] }; // NEW Class(...)

// ---------------- 语句 ----------------

export interface Param {
  name: string;
  type: DataType;
  byRef: boolean; // BYREF/BYVAL（默认按值）
}

export type CaseValue =
  | { kind: "value"; expr: Expr }
  | { kind: "range"; low: Expr; high: Expr };

export type FileOpKind =
  | "open"
  | "read"
  | "write"
  | "close"
  | "seek"
  | "get"
  | "put";

export type FileMode = "READ" | "WRITE" | "APPEND" | "RANDOM";

export type TypeDefBody =
  | { kind: "enum"; values: string[] }
  | { kind: "pointer"; elem: DataType }
  | { kind: "record"; fields: { name: string; type: DataType }[] }
  | { kind: "set"; elem: DataType };

export type Visibility = "PUBLIC" | "PRIVATE";

export type ClassMember =
  | { kind: "field"; name: string; type: DataType; visibility: Visibility }
  | {
      kind: "method";
      visibility: Visibility;
      fn: ProcOrFunc;
    };

export interface ProcOrFunc {
  name: string;
  params: Param[];
  isFunction: boolean;
  returnType: DataType | null;
  body: Stmt[];
}

export type Stmt =
  | { kind: "comment"; text: string }
  | { kind: "assign"; target: Expr; value: Expr }
  | { kind: "declare"; name: string; type: DataType }
  | { kind: "const"; name: string; value: Expr }
  | { kind: "input"; targets: Expr[] }
  | { kind: "output"; values: Expr[] }
  | {
      kind: "if";
      branches: { cond: Expr | null; body: Stmt[] }[]; // 最后一个 cond 为 null 表示 ELSE
    }
  | {
      kind: "case";
      subject: Expr;
      branches: { values: CaseValue[]; body: Stmt[] }[];
      otherwise: Stmt[] | null;
    }
  | {
      kind: "for";
      variable: string;
      from: Expr;
      to: Expr;
      step: Expr | null;
      body: Stmt[];
    }
  | { kind: "while"; cond: Expr; body: Stmt[] }
  | { kind: "repeat"; cond: Expr; body: Stmt[] } // cond 为 UNTIL 条件
  | { kind: "proc"; fn: ProcOrFunc }
  | { kind: "return"; value: Expr | null }
  | { kind: "call"; name: string; args: Expr[] } // 过程调用（语句）
  | {
      kind: "fileOp";
      op: FileOpKind;
      file: Expr;
      mode?: FileMode; // open 时使用
      target?: Expr; // read/get 的目标变量
      data?: Expr; // write/put 的数据
      address?: Expr; // seek 的地址
    }
  | { kind: "typeDef"; name: string; def: TypeDefBody }
  | { kind: "define"; name: string; values: string[]; typeName: string } // DEFINE set
  | { kind: "classDef"; name: string; inherits: string | null; members: ClassMember[] };

export interface Program {
  stmts: Stmt[];
  dialect: "IGCSE" | "ALEVEL" | "PYTHON";
  warnings: string[];
}
