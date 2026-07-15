/**
 * Java runner (custom JS tree-walking interpreter, covers AP CS A syntax)
 *
 * Design goals:
 *   - Pure frontend JS implementation, zero external dependencies (no JVM/WASM)
 *   - Covers all common AP CS A syntax: primitive types, classes and methods, arrays/ArrayList, inheritance, exceptions, switch, ternary
 *   - Error messages follow Java style (with line/column numbers), easy for beginners to debug
 *   - Consistent with Runner interface (types.ts), can directly replace the original CheerpJ implementation
 *
 * Architecture:
 *   1) Lexer: source code → token stream (preserves line/column numbers)
 *   2) Parser: token stream → simplified AST
 *   3) Interpreter: tree-walking execution of AST
 *
 * Limitations (outside AP CS A scope, not implemented yet):
 *   - Generics (only recognized in "declaration form" like ArrayList<Integer>, no real generic type checking)
 *   - Lambda / Stream / method references
 *   - Annotations, enums, records
 *   - Multithreading (synchronized / volatile)
 *   - Strict floating-point semantics (handled as IEEE 754 double precision)
 */
import { ref } from 'vue'
import type { Runner, RunContext } from './types'

// =============================================================
//  Lexer (lexical analyzer)
// =============================================================

// Keywords are represented as string literals (convenient for direct switch/case matching with the literal)
type TK =
  // Keywords
  | 'abstract' | 'assert' | 'boolean' | 'break' | 'byte' | 'case' | 'catch' | 'char'
  | 'class' | 'const' | 'continue' | 'default' | 'do' | 'double' | 'else' | 'enum'
  | 'extends' | 'final' | 'finally' | 'float' | 'for' | 'goto' | 'if' | 'implements'
  | 'import' | 'instanceof' | 'int' | 'interface' | 'long' | 'native' | 'new'
  | 'package' | 'private' | 'protected' | 'public' | 'return' | 'short' | 'static'
  | 'strictfp' | 'super' | 'switch' | 'synchronized' | 'this' | 'throw' | 'throws'
  | 'transient' | 'try' | 'void' | 'volatile' | 'while'
  | 'true' | 'false' | 'null'
  // Type identifiers treated as keywords (String/Integer/Double/Boolean)
  | 'String' | 'Integer' | 'Double' | 'Boolean' | 'Object' | 'Math' | 'System' | 'Scanner' | 'ArrayList' | 'List'
  // Punctuation
  | 'LPAREN' | 'RPAREN' | 'LBRACE' | 'RBRACE' | 'LBRACKET' | 'RBRACKET'
  | 'SEMI' | 'COMMA' | 'DOT' | 'COLON' | 'QUESTION' | 'AT'
  // Operators
  | 'PLUS' | 'MINUS' | 'STAR' | 'SLASH' | 'PERCENT'
  | 'EQ' | 'PLUS_EQ' | 'MINUS_EQ' | 'STAR_EQ' | 'SLASH_EQ' | 'PERCENT_EQ'
  | 'AMP_EQ' | 'PIPE_EQ' | 'CARET_EQ' | 'LT_LT_EQ' | 'GT_GT_EQ' | 'GT_GT_GT_EQ'
  | 'EQEQ' | 'NEQ' | 'LT' | 'GT' | 'LTE' | 'GTE'
  | 'AND' | 'OR' | 'NOT' | 'CARET' | 'TILDE' | 'LT_LT' | 'GT_GT' | 'GT_GT_GT'
  | 'AND_AND' | 'OR_OR'
  | 'PLUSPLUS' | 'MINUSMINUS'
  | 'ELLIPSIS' | 'ARROW' | 'DBL_COLON'
  // Literals / Identifiers
  | 'IDENT' | 'INT_LIT' | 'DOUBLE_LIT' | 'STRING_LIT' | 'CHAR_LIT'
  | 'EOF'

interface Token {
    type: TK
    value: string
    line: number
    col: number
}

const KEYWORDS: Record<string, TK> = {
    abstract: 'abstract', assert: 'assert', boolean: 'boolean', break: 'break',
    byte: 'byte', case: 'case', catch: 'catch', char: 'char', class: 'class',
    const: 'const', continue: 'continue', default: 'default', do: 'do',
    double: 'double', else: 'else', enum: 'enum', extends: 'extends',
    final: 'final', finally: 'finally', float: 'float', for: 'for',
    goto: 'goto', if: 'if', implements: 'implements', import: 'import',
    instanceof: 'instanceof', int: 'int', interface: 'interface', long: 'long',
    native: 'native', new: 'new', package: 'package', private: 'private',
    protected: 'protected', public: 'public', return: 'return', short: 'short',
    static: 'static', strictfp: 'strictfp', super: 'super', switch: 'switch',
    synchronized: 'synchronized', this: 'this', throw: 'throw', throws: 'throws',
    transient: 'transient', try: 'try', void: 'void', volatile: 'volatile',
    while: 'while', true: 'true', false: 'false', null: 'null',
    // Type names also treated as keywords (can be restored to IDENT during parsing if needed; kept as TK form here for convenient type checking)
    String: 'String', Integer: 'Integer', Double: 'Double', Boolean: 'Boolean',
    Object: 'Object', Math: 'Math', System: 'System', Scanner: 'Scanner',
    ArrayList: 'ArrayList', List: 'List',
}

function isDigit(c: string): boolean { return c >= '0' && c <= '9' }
function isAlpha(c: string): boolean { return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_' || c === '$' }
function isAlphaNum(c: string): boolean { return isAlpha(c) || isDigit(c) }

class LexError extends Error {
    constructor(msg: string, public line: number, public col: number) {
        super(`Lex error at ${line}:${col}: ${msg}`)
    }
}

function tokenize(source: string): Token[] {
    const tokens: Token[] = []
    let i = 0
    let line = 1
    let col = 1
    const n = source.length

    const peek = (off = 0) => source[i + off]
    const advance = () => {
        const c = source[i++]
        if (c === '\n') { line++; col = 1 } else { col++ }
        return c
    }
    const loc = () => ({ line, col })

    while (i < n) {
        const c = peek()

        // Whitespace
        if (c === ' ' || c === '\t' || c === '\r' || c === '\n') { advance(); continue }

        // Comments
        if (c === '/' && peek(1) === '/') {
            while (i < n && peek() !== '\n') advance()
            continue
        }
        if (c === '/' && peek(1) === '*') {
            advance(); advance()
            while (i < n && !(peek() === '*' && peek(1) === '/')) advance()
            if (i < n) { advance(); advance() }
            continue
        }

        const start = loc()

        // Identifier / Keyword
        if (isAlpha(c)) {
            let s = ''
            while (i < n && isAlphaNum(peek())) s += advance()
            const kw = KEYWORDS[s]
            if (kw) {
                tokens.push({ type: kw, value: s, line: start.line, col: start.col })
            } else {
                tokens.push({ type: 'IDENT', value: s, line: start.line, col: start.col })
            }
            continue
        }

        // Number
        if (isDigit(c)) {
            let s = ''
            let isDouble = false
            while (i < n && isDigit(peek())) s += advance()
            if (peek() === '.' && isDigit(peek(1))) {
                isDouble = true
                s += advance()
                while (i < n && isDigit(peek())) s += advance()
            }
            if (peek() === 'e' || peek() === 'E') {
                isDouble = true
                s += advance()
                if (peek() === '+' || peek() === '-') s += advance()
                while (i < n && isDigit(peek())) s += advance()
            }
            if (peek() === 'd' || peek() === 'D' || peek() === 'f' || peek() === 'F') advance()
            tokens.push({
                type: isDouble ? 'DOUBLE_LIT' : 'INT_LIT',
                value: s, line: start.line, col: start.col,
            })
            continue
        }

        // String
        if (c === '"') {
            advance()
            let s = ''
            while (i < n && peek() !== '"') {
                if (peek() === '\\') {
                    advance()
                    const esc = advance()
                    switch (esc) {
                        case 'n': s += '\n'; break
                        case 't': s += '\t'; break
                        case 'r': s += '\r'; break
                        case '\\': s += '\\'; break
                        case '"': s += '"'; break
                        case "'": s += "'"; break
                        case '0': s += '\0'; break
                        default: s += esc
                    }
                } else {
                    s += advance()
                }
            }
            if (peek() !== '"') throw new LexError('Unterminated string', start.line, start.col)
            advance()
            tokens.push({ type: 'STRING_LIT', value: s, line: start.line, col: start.col })
            continue
        }

        // Character
        if (c === "'") {
            advance()
            let s = ''
            if (peek() === '\\') {
                advance()
                const esc = advance()
                s = ({ n: '\n', t: '\t', r: '\r', '\\': '\\', "'": "'", '"': '"', '0': '\0' } as any)[esc] || esc
            } else {
                s = advance()
            }
            if (peek() !== "'") throw new LexError('Unterminated char', start.line, start.col)
            advance()
            tokens.push({ type: 'CHAR_LIT', value: s, line: start.line, col: start.col })
            continue
        }

        // Operators / Punctuation (three-char > two-char > single-char)
        const two = source.substr(i, 2)
        const three = source.substr(i, 3)
        const push = (type: TK, len: number, val?: string) => {
            const v = val ?? source.substr(i, len)
            for (let k = 0; k < len; k++) advance()
            tokens.push({ type, value: v, line: start.line, col: start.col })
        }
        if (three === '>>>=') { push('GT_GT_GT_EQ', 3); continue }
        if (three === '<<=') { push('LT_LT_EQ', 3); continue }
        if (three === '>>=') { push('GT_GT_EQ', 3); continue }
        if (three === '...') { push('ELLIPSIS', 3); continue }
        if (two === '::') { push('DBL_COLON', 2); continue }
        if (two === '->') { push('ARROW', 2); continue }
        if (two === '++') { push('PLUSPLUS', 2); continue }
        if (two === '--') { push('MINUSMINUS', 2); continue }
        if (two === '==') { push('EQEQ', 2); continue }
        if (two === '!=') { push('NEQ', 2); continue }
        if (two === '<=') { push('LTE', 2); continue }
        if (two === '>=') { push('GTE', 2); continue }
        if (two === '&&') { push('AND_AND', 2); continue }
        if (two === '||') { push('OR_OR', 2); continue }
        if (two === '<<') { push('LT_LT', 2); continue }
        if (two === '>>') { push('GT_GT', 2); continue }
        if (two === '>>>') { push('GT_GT_GT', 3); continue }
        if (two === '+=') { push('PLUS_EQ', 2); continue }
        if (two === '-=') { push('MINUS_EQ', 2); continue }
        if (two === '*=') { push('STAR_EQ', 2); continue }
        if (two === '/=') { push('SLASH_EQ', 2); continue }
        if (two === '%=') { push('PERCENT_EQ', 2); continue }
        if (two === '&=') { push('AMP_EQ', 2); continue }
        if (two === '|=') { push('PIPE_EQ', 2); continue }
        if (two === '^=') { push('CARET_EQ', 2); continue }

        switch (c) {
            case '+': push('PLUS', 1); continue
            case '-': push('MINUS', 1); continue
            case '*': push('STAR', 1); continue
            case '/': push('SLASH', 1); continue
            case '%': push('PERCENT', 1); continue
            case '=': push('EQ', 1); continue
            case '<': push('LT', 1); continue
            case '>': push('GT', 1); continue
            case '&': push('AND', 1); continue
            case '|': push('OR', 1); continue
            case '^': push('CARET', 1); continue
            case '~': push('TILDE', 1); continue
            case '!': push('NOT', 1); continue
            case '(': push('LPAREN', 1); continue
            case ')': push('RPAREN', 1); continue
            case '{': push('LBRACE', 1); continue
            case '}': push('RBRACE', 1); continue
            case '[': push('LBRACKET', 1); continue
            case ']': push('RBRACKET', 1); continue
            case ';': push('SEMI', 1); continue
            case ',': push('COMMA', 1); continue
            case '.': push('DOT', 1); continue
            case ':': push('COLON', 1); continue
            case '?': push('QUESTION', 1); continue
            case '@': push('AT', 1); continue
        }
        throw new LexError(`Unexpected character '${c}'`, start.line, start.col)
    }
    tokens.push({ type: 'EOF', value: '', line, col })
    return tokens
}

// =============================================================
//  AST node definitions
// =============================================================

interface Pos { line: number; col: number }

interface ProgramNode { kind: 'Program'; classes: ClassNode[] }

interface ModSet { isPublic: boolean; isStatic: boolean; isFinal: boolean }

interface ClassNode {
    kind: 'Class'
    pos: Pos
    name: string
    superClass: string | null
    interfaces: string[]
    members: MemberNode[]
}

type MemberNode = MethodNode | ConstructorNode | FieldNode

interface MethodNode {
    kind: 'Method'
    pos: Pos
    mods: ModSet
    returnType: string
    name: string
    params: ParamNode[]
    body: BlockStmt
}

interface ConstructorNode {
    kind: 'Constructor'
    pos: Pos
    mods: ModSet
    name: string
    params: ParamNode[]
    body: BlockStmt
    superCall: SuperCallExpr | null
    thisCall: ThisCallExpr | null
}

interface FieldNode {
    kind: 'Field'
    pos: Pos
    mods: ModSet
    fieldType: string
    name: string
    init: Expr | null
}

interface ParamNode {
    kind: 'Param'
    pos: Pos
    paramType: string
    name: string
}

type Stmt =
    | BlockStmt
    | VarDeclStmt
    | ExprStmt
    | IfStmt
    | WhileStmt
    | ForStmt
    | ForEachStmt
    | DoWhileStmt
    | ReturnStmt
    | BreakStmt
    | ContinueStmt
    | SwitchStmt
    | TryStmt
    | ThrowStmt
    | EmptyStmt

interface BlockStmt { kind: 'Block'; pos: Pos; stmts: Stmt[] }
interface VarDeclStmt {
    kind: 'VarDecl'; pos: Pos
    varType: string
    name: string
    init: Expr | null
}
interface ExprStmt { kind: 'ExprStmt'; pos: Pos; expr: Expr }
interface IfStmt {
    kind: 'If'; pos: Pos
    cond: Expr
    then: Stmt
    else: Stmt | null
}
interface WhileStmt { kind: 'While'; pos: Pos; cond: Expr; body: Stmt }
interface ForStmt {
    kind: 'For'; pos: Pos
    init: Stmt | null
    cond: Expr | null
    update: Expr | null
    body: Stmt
}
interface ForEachStmt {
    kind: 'ForEach'; pos: Pos
    varType: string
    name: string
    iter: Expr
    body: Stmt
}
interface DoWhileStmt { kind: 'DoWhile'; pos: Pos; body: Stmt; cond: Expr }
interface ReturnStmt { kind: 'Return'; pos: Pos; value: Expr | null }
interface BreakStmt { kind: 'Break'; pos: Pos; label?: string }
interface ContinueStmt { kind: 'Continue'; pos: Pos; label?: string }
interface SwitchStmt {
    kind: 'Switch'; pos: Pos
    target: Expr
    cases: SwitchCase[]
    default: Stmt[] | null
}
interface SwitchCase {
    values: Expr[]   // Multiple values correspond to case 1, 2: form
    body: Stmt[]
}
interface TryStmt {
    kind: 'Try'; pos: Pos
    tryBlock: BlockStmt
    catches: CatchClause[]
    finallyBlock: BlockStmt | null
}
interface CatchClause {
    kind: 'Catch'; pos: Pos
    exType: string
    name: string
    body: BlockStmt
}
interface ThrowStmt { kind: 'Throw'; pos: Pos; expr: Expr }
interface EmptyStmt { kind: 'Empty'; pos: Pos }

type Expr =
    | BinaryExpr
    | UnaryExpr
    | AssignExpr
    | CallExpr
    | MethodRefExpr
    | NewObjectExpr
    | NewArrayExpr
    | MemberExpr
    | IndexExpr
    | IdentExpr
    | LitExpr
    | ArrayLitExpr
    | ThisExpr
    | SuperExpr
    | SuperCallExpr
    | ThisCallExpr
    | CastExpr
    | PrePostExpr
    | TernaryExpr
    | InstanceOfExpr

interface BinaryExpr {
    kind: 'Binary'; pos: Pos
    op: string
    left: Expr
    right: Expr
}
interface UnaryExpr { kind: 'Unary'; pos: Pos; op: string; operand: Expr; prefix: boolean }
interface AssignExpr { kind: 'Assign'; pos: Pos; op: string; target: Expr; value: Expr }
interface CallExpr {
    kind: 'Call'; pos: Pos
    callee: Expr
    args: Expr[]
}
interface MethodRefExpr { kind: 'MethodRef'; pos: Pos; target: Expr; name: string }
interface NewObjectExpr {
    kind: 'NewObject'; pos: Pos
    className: string
    args: Expr[]
}
interface NewArrayExpr {
    kind: 'NewArray'; pos: Pos
    elementType: string
    dimensions: Expr[]  // One size per dimension
    initializer: ArrayLitExpr | null
}
interface MemberExpr {
    kind: 'Member'; pos: Pos
    obj: Expr
    name: string
}
interface IndexExpr { kind: 'Index'; pos: Pos; target: Expr; index: Expr }
interface IdentExpr { kind: 'Ident'; pos: Pos; name: string }
interface LitExpr { kind: 'Lit'; pos: Pos; value: any; litType: 'int' | 'double' | 'boolean' | 'string' | 'char' | 'null' }
interface ArrayLitExpr { kind: 'ArrayLit'; pos: Pos; elements: Expr[] }
interface ThisExpr { kind: 'This'; pos: Pos }
interface SuperExpr { kind: 'Super'; pos: Pos }
interface SuperCallExpr { kind: 'SuperCall'; pos: Pos; args: Expr[] }
interface ThisCallExpr { kind: 'ThisCall'; pos: Pos; args: Expr[] }
interface CastExpr { kind: 'Cast'; pos: Pos; targetType: string; expr: Expr }
interface PrePostExpr { kind: 'PrePost'; pos: Pos; op: '++' | '--'; target: Expr; prefix: boolean }
interface TernaryExpr { kind: 'Ternary'; pos: Pos; cond: Expr; then: Expr; else: Expr }
interface InstanceOfExpr { kind: 'InstanceOf'; pos: Pos; expr: Expr; checkType: string }

// =============================================================
//  Parser (recursive descent)
// =============================================================

class ParseError extends Error {
    constructor(msg: string, public line: number, public col: number) {
        super(`Parse error at ${line}:${col}: ${msg}`)
    }
}

class Parser {
    private pos = 0
    constructor(private tokens: Token[]) {}

    private peek(off = 0): Token { return this.tokens[this.pos + off] }
    private advance(): Token { return this.tokens[this.pos++] }
    private match(type: TK): boolean { return this.peek().type === type }
    private expect(type: TK, msg?: string): Token {
        const t = this.peek()
        if (t.type !== type) {
            throw new ParseError(msg || `Expected ${type}, got ${t.type} ('${t.value}')`, t.line, t.col)
        }
        return this.advance()
    }
    private skipSemi() {
        // Allow empty semicolons
        while (this.match('SEMI')) this.advance()
    }

    parse(): ProgramNode {
        // Skip package / import declarations
        while (this.match('package') || this.match('import')) {
            this.advance()
            while (!this.match('SEMI') && !this.match('EOF')) this.advance()
            if (this.match('SEMI')) this.advance()
        }
        const classes: ClassNode[] = []
        while (!this.match('EOF')) {
            // Skip top-level modifiers public / abstract / final
            while (this.match('public') || this.match('abstract') || this.match('final') ||
                   this.match('private') || this.match('protected') || this.match('static')) {
                this.advance()
            }
            // Top-level can only be class / interface (only class is supported here)
            if (this.match('class')) {
                classes.push(this.parseClass())
            } else if (this.match('interface')) {
                this.parseInterfaceStub()
            } else {
                const t = this.peek()
                throw new ParseError(`Unexpected top-level token '${t.value}'`, t.line, t.col)
            }
        }
        return { kind: 'Program', classes }
    }

    private parseInterfaceStub() {
        // Interface: not implemented yet, consume the entire declaration
        this.advance()
        this.expect('IDENT', 'Expected interface name')
        while (this.peek().type !== 'LBRACE' && !this.match('EOF')) this.advance()
        if (this.match('LBRACE')) {
            let depth = 0
            while (!this.match('EOF')) {
                const t = this.advance()
                if (t.type === 'LBRACE') depth++
                else if (t.type === 'RBRACE') { depth--; if (depth === 0) break }
            }
        }
    }

    private parseMods(): ModSet {
        const m: ModSet = { isPublic: false, isStatic: false, isFinal: false }
        for (;;) {
            const t = this.peek()
            if (t.type === 'public') { m.isPublic = true; this.advance() }
            else if (t.type === 'private') { this.advance() }
            else if (t.type === 'protected') { this.advance() }
            else if (t.type === 'static') { m.isStatic = true; this.advance() }
            else if (t.type === 'final') { m.isFinal = true; this.advance() }
            else break
        }
        return m
    }

    private parseType(): string {
        // Supports int[] / int[][] / String, etc.
        // Handle generic angle bracket parameters (kept empty)
        const t = this.peek()
        if (t.type === 'IDENT' || t.type === 'int' || t.type === 'double' ||
            t.type === 'boolean' || t.type === 'char' || t.type === 'void' ||
            t.type === 'String' || t.type === 'Integer' || t.type === 'Double' ||
            t.type === 'Boolean' || t.type === 'Object' || t.type === 'Scanner' ||
            t.type === 'ArrayList' || t.type === 'List' ||
            t.type === 'float' || t.type === 'long' || t.type === 'short' || t.type === 'byte') {
            let type = this.advance().value
            // Generics <Integer> / <?>
            if (this.match('LT')) {
                this.advance()
                let depth = 1
                while (depth > 0 && !this.match('EOF')) {
                    const tt = this.advance().type
                    if (tt === 'LT') depth++
                    else if (tt === 'GT') depth--
                }
            }
            while (this.match('LBRACKET')) {
                this.advance()
                this.expect('RBRACKET')
                type += '[]'
            }
            return type
        }
        throw new ParseError(`Expected type, got '${t.value}'`, t.line, t.col)
    }

    private parseClass(): ClassNode {
        const start = this.peek()
        this.expect('class')
        const name = this.expect('IDENT', 'Expected class name').value
        let superClass: string | null = null
        const interfaces: string[] = []
        if (this.match('extends')) {
            this.advance()
            superClass = this.expect('IDENT', 'Expected super class name').value
            // Also allows extends ClassName<T>
            if (this.match('LT')) {
                let depth = 1
                this.advance()
                while (depth > 0 && !this.match('EOF')) {
                    const tt = this.advance().type
                    if (tt === 'LT') depth++
                    else if (tt === 'GT') depth--
                }
            }
        }
        if (this.match('implements')) {
            this.advance()
            interfaces.push(this.expect('IDENT', 'Expected interface name').value)
            while (this.match('COMMA')) {
                this.advance()
                interfaces.push(this.expect('IDENT').value)
            }
        }
        this.expect('LBRACE')
        const members: MemberNode[] = []
        while (!this.match('RBRACE') && !this.match('EOF')) {
            const member = this.parseMember()
            if (member) members.push(member)
        }
        this.expect('RBRACE')
        return { kind: 'Class', pos: { line: start.line, col: start.col }, name, superClass, interfaces, members }
    }

    private parseMember(): MemberNode | null {
        const mods = this.parseMods()
        const t = this.peek()

        // Constructor: name matches class name
        if (t.type === 'IDENT' && this.peek(1).type === 'LPAREN') {
            const ctor = this.parseConstructor(mods)
            return ctor
        }

        // Field / Method: parse type first
        const retType = this.parseType()
        const nameTok = this.expect('IDENT', 'Expected member name')
        const name = nameTok.value

        if (this.match('LPAREN')) {
            // Method
            const m: MethodNode = {
                kind: 'Method', pos: { line: nameTok.line, col: nameTok.col },
                mods, returnType: retType, name, params: [], body: { kind: 'Block', pos: { line: 0, col: 0 }, stmts: [] },
            }
            this.advance()
            m.params = this.parseParamList()
            this.expect('RPAREN')
            // Consume possible throws clause
            if (this.match('throws')) {
                this.advance()
                this.expect('IDENT')
                while (this.match('COMMA')) { this.advance(); this.expect('IDENT') }
            }
            m.body = this.parseBlock()
            return m
        } else {
            // Field
            const init: Expr | null = this.match('EQ') ? (this.advance(), this.parseExpr()) : null
            this.skipSemi()
            return {
                kind: 'Field', pos: { line: nameTok.line, col: nameTok.col },
                mods, fieldType: retType, name, init,
            }
        }
    }

    private parseConstructor(mods: ModSet): ConstructorNode {
        const start = this.peek()
        const name = this.expect('IDENT', 'Expected constructor name').value
        this.expect('LPAREN')
        const params = this.parseParamList()
        this.expect('RPAREN')
        if (this.match('throws')) {
            this.advance()
            this.expect('IDENT')
            while (this.match('COMMA')) { this.advance(); this.expect('IDENT') }
        }
        this.expect('LBRACE')

        // First statement in constructor body may be super(...) / this(...) — must be in this( / super( form to avoid confusion with this.xxx member access
        let superCall: SuperCallExpr | null = null
        let thisCall: ThisCallExpr | null = null
        if (this.match('super') && this.peek(1).type === 'LPAREN') {
            this.advance()
            this.expect('LPAREN')
            const args = this.parseArgList()
            this.expect('RPAREN')
            this.expect('SEMI')
            superCall = { kind: 'SuperCall', pos: { line: 0, col: 0 }, args }
        } else if (this.match('this') && this.peek(1).type === 'LPAREN') {
            this.advance()
            this.expect('LPAREN')
            const args = this.parseArgList()
            this.expect('RPAREN')
            this.expect('SEMI')
            thisCall = { kind: 'ThisCall', pos: { line: 0, col: 0 }, args }
        }

        const stmts: Stmt[] = []
        while (!this.match('RBRACE') && !this.match('EOF')) {
            stmts.push(this.parseStmt())
        }
        this.expect('RBRACE')
        return {
            kind: 'Constructor', pos: { line: start.line, col: start.col },
            mods, name, params, body: { kind: 'Block', pos: { line: 0, col: 0 }, stmts },
            superCall, thisCall,
        }
    }

    private parseParamList(): ParamNode[] {
        const list: ParamNode[] = []
        if (this.match('RPAREN')) return list
        const p = this.parseParam()
        list.push(p)
        while (this.match('COMMA')) {
            this.advance()
            list.push(this.parseParam())
        }
        return list
    }

    private parseParam(): ParamNode {
        const start = this.peek()
        const t = this.parseType()
        const name = this.expect('IDENT', 'Expected parameter name').value
        return { kind: 'Param', pos: { line: start.line, col: start.col }, paramType: t, name }
    }

    private parseArgList(): Expr[] {
        const list: Expr[] = []
        if (this.match('RPAREN')) return list
        list.push(this.parseExpr())
        while (this.match('COMMA')) {
            this.advance()
            list.push(this.parseExpr())
        }
        return list
    }

    private parseBlock(): BlockStmt {
        const start = this.peek()
        this.expect('LBRACE')
        const stmts: Stmt[] = []
        while (!this.match('RBRACE') && !this.match('EOF')) {
            stmts.push(this.parseStmt())
        }
        this.expect('RBRACE')
        return { kind: 'Block', pos: { line: start.line, col: start.col }, stmts }
    }

    private parseStmt(): Stmt {
        const t = this.peek()

        // Empty statement
        if (t.type === 'SEMI') { this.advance(); return { kind: 'Empty', pos: { line: t.line, col: t.col } } }

        // Block
        if (t.type === 'LBRACE') return this.parseBlock()

        // Variable declaration
        if (this.isTypeDeclStart()) {
            return this.parseVarDecl()
        }

        // Control flow
        if (t.type === 'if') return this.parseIf()
        if (t.type === 'while') return this.parseWhile()
        if (t.type === 'for') return this.parseFor()
        if (t.type === 'do') return this.parseDoWhile()
        if (t.type === 'return') return this.parseReturn()
        if (t.type === 'break') { this.advance(); this.skipSemi(); return { kind: 'Break', pos: { line: t.line, col: t.col } } }
        if (t.type === 'continue') { this.advance(); this.skipSemi(); return { kind: 'Continue', pos: { line: t.line, col: t.col } } }
        if (t.type === 'switch') return this.parseSwitch()
        if (t.type === 'try') return this.parseTry()
        if (t.type === 'throw') return this.parseThrow()
        if (t.type === 'super') {
            this.advance()
            this.expect('LPAREN')
            const args = this.parseArgList()
            this.expect('RPAREN')
            this.expect('SEMI')
            return { kind: 'ExprStmt', pos: { line: t.line, col: t.col }, expr: { kind: 'SuperCall', pos: { line: t.line, col: t.col }, args } }
        }

        // Expression statement
        const e = this.parseExpr()
        this.skipSemi()
        return { kind: 'ExprStmt', pos: { line: t.line, col: t.col }, expr: e }
    }

    private isTypeStart(t: Token): boolean {
        // System / Math are usually used for static member access (System.out, Math.max), cannot be treated as type names
        if (t.type === 'System' || t.type === 'Math') return false
        return t.type === 'IDENT' || t.type === 'int' || t.type === 'double' ||
            t.type === 'boolean' || t.type === 'char' || t.type === 'String' ||
            t.type === 'Integer' || t.type === 'Double' || t.type === 'Boolean' ||
            t.type === 'Object' || t.type === 'Scanner' || t.type === 'ArrayList' ||
            t.type === 'List' || t.type === 'float' || t.type === 'long' ||
            t.type === 'short' || t.type === 'byte'
    }

    // Distinguish "type declaration" from "method call start": Scanner sc is a declaration, Scanner.println() is a call
    // Determine by looking ahead 1-2 tokens: must be Type name + IDENT (including generic ArrayList<Integer> form)
    private isTypeDeclStart(): boolean {
        const t = this.peek()
        if (!this.isTypeStart(t)) return false
        let off = 1
        // Skip array dimensions [ ]
        while (this.matchAt(off, 'LBRACKET')) {
            off++
            if (this.matchAt(off, 'RBRACKET')) off++
            else return false
        }
        // Skip generic parameters <Type, Type, ...> (including nested <...>)
        if (this.matchAt(off, 'LT')) {
            off++
            let depth = 1
            while (depth > 0 && !this.matchAt(off, 'EOF')) {
                const ty = this.peek(off).type
                if (ty === 'LT') depth++
                else if (ty === 'GT') depth--
                off++
            }
        }
        return this.matchAt(off, 'IDENT')
    }
    private matchAt(off: number, type: TK): boolean {
        return this.peek(off).type === type
    }

    private parseVarDecl(): VarDeclStmt {
        const start = this.peek()
        const t = this.parseType()
        const name = this.expect('IDENT', 'Expected variable name').value
        let init: Expr | null = null
        if (this.match('EQ')) { this.advance(); init = this.parseExpr() }
        this.skipSemi()
        return { kind: 'VarDecl', pos: { line: start.line, col: start.col }, varType: t, name, init }
    }

    private parseIf(): IfStmt {
        const start = this.peek()
        this.expect('if')
        this.expect('LPAREN')
        const cond = this.parseExpr()
        this.expect('RPAREN')
        const then = this.parseStmt()
        let elseS: Stmt | null = null
        if (this.match('else')) { this.advance(); elseS = this.parseStmt() }
        return { kind: 'If', pos: { line: start.line, col: start.col }, cond, then, else: elseS }
    }

    private parseWhile(): WhileStmt {
        const start = this.peek()
        this.expect('while')
        this.expect('LPAREN')
        const cond = this.parseExpr()
        this.expect('RPAREN')
        const body = this.parseStmt()
        return { kind: 'While', pos: { line: start.line, col: start.col }, cond, body }
    }

    private parseFor(): Stmt {
        const start = this.peek()
        this.expect('for')
        this.expect('LPAREN')

        // for-each detection: for (Type x : expr) ...
        // Look ahead without consuming the colon: try parsing Type + IDENT, if next is COLON then take the for-each path
        if (this.isTypeStart(this.peek())) {
            const savePos = this.pos
            try {
                const varType = this.parseType()
                const nameTok = this.peek()
                if (nameTok.type === 'IDENT' && this.peek(1).type === 'COLON') {
                    this.advance()  // name
                    this.advance()  // colon
                    const iter = this.parseExpr()
                    this.expect('RPAREN')
                    const body = this.parseStmt()
                    return { kind: 'ForEach', pos: { line: start.line, col: start.col }, varType, name: nameTok.value, iter, body }
                }
                // Not for-each, backtrack
                this.pos = savePos
            } catch {
                this.pos = savePos
            }
        }

        // Regular for
        const t3 = this.peek()
        let init: Stmt | null = null
        if (!this.match('SEMI')) {
            if (this.isTypeDeclStart()) {
                init = this.parseVarDeclNoSemi()
            } else {
                const e = this.parseExpr()
                init = { kind: 'ExprStmt', pos: { line: t3.line, col: t3.col }, expr: e }
            }
        } else {
            this.advance()
        }
        let cond: Expr | null = null
        if (!this.match('SEMI')) cond = this.parseExpr()
        this.expect('SEMI')
        let update: Expr | null = null
        if (!this.match('RPAREN')) update = this.parseExpr()
        this.expect('RPAREN')
        const body = this.parseStmt()
        return { kind: 'For', pos: { line: start.line, col: start.col }, init, cond, update, body }
    }

    // Parse variable declaration without consuming semicolon (for for-loop header)
    private parseVarDeclNoSemi(): VarDeclStmt {
        const start = this.peek()
        const t = this.parseType()
        const name = this.expect('IDENT').value
        let init: Expr | null = null
        if (this.match('EQ')) { this.advance(); init = this.parseExpr() }
        this.expect('SEMI')
        return { kind: 'VarDecl', pos: { line: start.line, col: start.col }, varType: t, name, init }
    }

    private parseDoWhile(): DoWhileStmt {
        const start = this.peek()
        this.expect('do')
        const body = this.parseStmt()
        this.expect('while')
        this.expect('LPAREN')
        const cond = this.parseExpr()
        this.expect('RPAREN')
        this.expect('SEMI')
        return { kind: 'DoWhile', pos: { line: start.line, col: start.col }, body, cond }
    }

    private parseReturn(): ReturnStmt {
        const start = this.peek()
        this.advance()
        let value: Expr | null = null
        if (!this.match('SEMI') && !this.match('RBRACE')) value = this.parseExpr()
        this.skipSemi()
        return { kind: 'Return', pos: { line: start.line, col: start.col }, value }
    }

    private parseSwitch(): SwitchStmt {
        const start = this.peek()
        this.expect('switch')
        this.expect('LPAREN')
        const target = this.parseExpr()
        this.expect('RPAREN')
        this.expect('LBRACE')
        const cases: SwitchCase[] = []
        let def: Stmt[] | null = null
        while (!this.match('RBRACE') && !this.match('EOF')) {
            if (this.match('case')) {
                this.advance()
                const values: Expr[] = [this.parseExpr()]
                while (this.match('COMMA')) { this.advance(); values.push(this.parseExpr()) }
                this.expect('COLON')
                const body: Stmt[] = []
                while (!this.match('case') && !this.match('default') && !this.match('RBRACE') && !this.match('EOF')) {
                    body.push(this.parseStmt())
                }
                cases.push({ values, body })
            } else if (this.match('default')) {
                this.advance()
                this.expect('COLON')
                const body: Stmt[] = []
                while (!this.match('case') && !this.match('RBRACE') && !this.match('default') && !this.match('EOF')) {
                    body.push(this.parseStmt())
                }
                def = body
            } else {
                const t = this.peek()
                throw new ParseError(`Expected 'case' or 'default'`, t.line, t.col)
            }
        }
        this.expect('RBRACE')
        return { kind: 'Switch', pos: { line: start.line, col: start.col }, target, cases, default: def }
    }

    private parseTry(): TryStmt {
        const start = this.peek()
        this.expect('try')
        const tryBlock = this.parseBlock()
        const catches: CatchClause[] = []
        while (this.match('catch')) {
            this.advance()
            this.expect('LPAREN')
            // Exception type (may have final)
            if (this.match('final')) this.advance()
            const exType = this.parseType()
            const exName = this.expect('IDENT', 'Expected catch variable name').value
            this.expect('RPAREN')
            const body = this.parseBlock()
            catches.push({ kind: 'Catch', pos: { line: 0, col: 0 }, exType, name: exName, body })
        }
        let finallyBlock: BlockStmt | null = null
        if (this.match('finally')) {
            this.advance()
            finallyBlock = this.parseBlock()
        }
        return { kind: 'Try', pos: { line: start.line, col: start.col }, tryBlock, catches, finallyBlock }
    }

    private parseThrow(): ThrowStmt {
        const start = this.peek()
        this.advance()
        const expr = this.parseExpr()
        this.skipSemi()
        return { kind: 'Throw', pos: { line: start.line, col: start.col }, expr }
    }

    // ---- Expressions (Pratt style, operator precedence) ----

    private parseExpr(): Expr { return this.parseAssignment() }

    private parseAssignment(): Expr {
        const left = this.parseTernary()
        if (this.match('EQ') || this.match('PLUS_EQ') || this.match('MINUS_EQ') ||
            this.match('STAR_EQ') || this.match('SLASH_EQ') || this.match('PERCENT_EQ') ||
            this.match('AMP_EQ') || this.match('PIPE_EQ') || this.match('CARET_EQ') ||
            this.match('LT_LT_EQ') || this.match('GT_GT_EQ') || this.match('GT_GT_GT_EQ')) {
            const opTok = this.advance()
            const op = opTok.value
            const value = this.parseAssignment()
            return { kind: 'Assign', pos: { line: left.pos.line, col: left.pos.col }, op, target: left, value }
        }
        return left
    }

    private parseTernary(): Expr {
        const cond = this.parseOr()
        if (this.match('QUESTION')) {
            this.advance()
            const then = this.parseExpr()
            this.expect('COLON')
            const els = this.parseExpr()
            return { kind: 'Ternary', pos: { line: cond.pos.line, col: cond.pos.col }, cond, then, else: els }
        }
        return cond
    }

    private parseOr(): Expr {
        let left = this.parseAnd()
        while (this.match('OR_OR')) { this.advance(); const r = this.parseAnd(); left = { kind: 'Binary', pos: left.pos, op: '||', left, right: r } }
        return left
    }

    private parseAnd(): Expr {
        let left = this.parseBitwiseOr()
        while (this.match('AND_AND')) { this.advance(); const r = this.parseBitwiseOr(); left = { kind: 'Binary', pos: left.pos, op: '&&', left, right: r } }
        return left
    }

    private parseBitwiseOr(): Expr {
        let left = this.parseBitwiseXor()
        while (this.match('OR')) { this.advance(); const r = this.parseBitwiseXor(); left = { kind: 'Binary', pos: left.pos, op: '|', left, right: r } }
        return left
    }

    private parseBitwiseXor(): Expr {
        let left = this.parseBitwiseAnd()
        while (this.match('CARET')) { this.advance(); const r = this.parseBitwiseAnd(); left = { kind: 'Binary', pos: left.pos, op: '^', left, right: r } }
        return left
    }

    private parseBitwiseAnd(): Expr {
        let left = this.parseEquality()
        while (this.match('AND')) { this.advance(); const r = this.parseEquality(); left = { kind: 'Binary', pos: left.pos, op: '&', left, right: r } }
        return left
    }

    private parseEquality(): Expr {
        let left = this.parseRelational()
        while (this.match('EQEQ') || this.match('NEQ')) {
            const op = this.advance().value
            const r = this.parseRelational()
            left = { kind: 'Binary', pos: left.pos, op, left, right: r }
        }
        return left
    }

    private parseRelational(): Expr {
        let left = this.parseShift()
        while (this.match('LT') || this.match('GT') || this.match('LTE') || this.match('GTE') || this.match('instanceof')) {
            if (this.match('instanceof')) {
                this.advance()
                const t = this.parseType()
                left = { kind: 'InstanceOf', pos: left.pos, expr: left, checkType: t }
            } else {
                const op = this.advance().value
                const r = this.parseShift()
                left = { kind: 'Binary', pos: left.pos, op, left, right: r }
            }
        }
        return left
    }

    private parseShift(): Expr {
        let left = this.parseAdditive()
        while (this.match('LT_LT') || this.match('GT_GT') || this.match('GT_GT_GT')) {
            const op = this.advance().value
            const r = this.parseAdditive()
            left = { kind: 'Binary', pos: left.pos, op, left, right: r }
        }
        return left
    }

    private parseAdditive(): Expr {
        let left = this.parseMultiplicative()
        while (this.match('PLUS') || this.match('MINUS')) {
            const op = this.advance().value
            const r = this.parseMultiplicative()
            left = { kind: 'Binary', pos: left.pos, op, left, right: r }
        }
        return left
    }

    private parseMultiplicative(): Expr {
        let left = this.parseUnary()
        while (this.match('STAR') || this.match('SLASH') || this.match('PERCENT')) {
            const op = this.advance().value
            const r = this.parseUnary()
            left = { kind: 'Binary', pos: left.pos, op, left, right: r }
        }
        return left
    }

    private parseUnary(): Expr {
        const t = this.peek()
        if (t.type === 'PLUSPLUS' || t.type === 'MINUSMINUS') {
            this.advance()
            const target = this.parseUnary()
            return { kind: 'PrePost', pos: { line: t.line, col: t.col }, op: t.value as '++' | '--', target, prefix: true }
        }
        if (t.type === 'PLUS' || t.type === 'MINUS' || t.type === 'NOT' || t.type === 'TILDE') {
            this.advance()
            const operand = this.parseUnary()
            return { kind: 'Unary', pos: { line: t.line, col: t.col }, op: t.value, operand, prefix: true }
        }
        // Type cast (Type) expr — simple heuristic: left parenthesis followed by a type name
        if (t.type === 'LPAREN' && this.isTypeStart(this.peek(1))) {
            const save = this.pos
            let castType: string | null = null
            try {
                this.advance()
                castType = this.parseType()
                if (this.match('RPAREN')) {
                    this.advance()
                    const e = this.parseUnary()
                    return { kind: 'Cast', pos: { line: t.line, col: t.col }, targetType: castType, expr: e }
                }
            } catch { /* fall through */ }
            this.pos = save
        }
        return this.parsePostfix()
    }

    private parsePostfix(): Expr {
        let e = this.parsePrimary()
        for (;;) {
            const t = this.peek()
            if (t.type === 'DOT') {
                this.advance()
                const name = this.expect('IDENT', 'Expected member name').value
                e = { kind: 'Member', pos: e.pos, obj: e, name }
            } else if (t.type === 'LBRACKET') {
                this.advance()
                const idx = this.parseExpr()
                this.expect('RBRACKET')
                e = { kind: 'Index', pos: e.pos, target: e, index: idx }
            } else if (t.type === 'LPAREN') {
                this.advance()
                const args = this.parseArgList()
                this.expect('RPAREN')
                e = { kind: 'Call', pos: e.pos, callee: e, args }
            } else if (t.type === 'PLUSPLUS' || t.type === 'MINUSMINUS') {
                this.advance()
                e = { kind: 'PrePost', pos: e.pos, op: t.value as '++' | '--', target: e, prefix: false }
            } else {
                break
            }
        }
        return e
    }

    private parsePrimary(): Expr {
        const t = this.peek()
        if (t.type === 'INT_LIT') { this.advance(); return { kind: 'Lit', pos: { line: t.line, col: t.col }, value: parseInt(t.value, 10), litType: 'int' } }
        if (t.type === 'DOUBLE_LIT') { this.advance(); return { kind: 'Lit', pos: { line: t.line, col: t.col }, value: parseFloat(t.value), litType: 'double' } }
        if (t.type === 'STRING_LIT') { this.advance(); return { kind: 'Lit', pos: { line: t.line, col: t.col }, value: t.value, litType: 'string' } }
        if (t.type === 'CHAR_LIT') { this.advance(); return { kind: 'Lit', pos: { line: t.line, col: t.col }, value: t.value, litType: 'char' } }
        if (t.type === 'true') { this.advance(); return { kind: 'Lit', pos: { line: t.line, col: t.col }, value: true, litType: 'boolean' } }
        if (t.type === 'false') { this.advance(); return { kind: 'Lit', pos: { line: t.line, col: t.col }, value: false, litType: 'boolean' } }
        if (t.type === 'null') { this.advance(); return { kind: 'Lit', pos: { line: t.line, col: t.col }, value: null, litType: 'null' } }
        if (t.type === 'this') { this.advance(); return { kind: 'This', pos: { line: t.line, col: t.col } } }
        if (t.type === 'super') { this.advance(); return { kind: 'Super', pos: { line: t.line, col: t.col } } }
        if (t.type === 'new') return this.parseNew()
        if (t.type === 'IDENT') { this.advance(); return { kind: 'Ident', pos: { line: t.line, col: t.col }, name: t.value } }
        // Type name keywords (System/Math/ArrayList, etc.) treated as identifiers: System.out, Math.max, ArrayList.toString
        if (t.type === 'System' || t.type === 'Math' || t.type === 'ArrayList' ||
            t.type === 'Scanner' || t.type === 'List' || t.type === 'String' ||
            t.type === 'Integer' || t.type === 'Double' || t.type === 'Boolean' ||
            t.type === 'Object') {
            this.advance()
            return { kind: 'Ident', pos: { line: t.line, col: t.col }, name: t.value }
        }
        // Array literal: {1, 2, 3}
        if (t.type === 'LBRACE') {
            const start = t
            this.advance()
            const elements: Expr[] = []
            if (!this.match('RBRACE')) {
                elements.push(this.parseExpr())
                while (this.match('COMMA')) { this.advance(); elements.push(this.parseExpr()) }
            }
            this.expect('RBRACE')
            return { kind: 'ArrayLit', pos: { line: start.line, col: start.col }, elements }
        }
        if (t.type === 'LPAREN') {
            this.advance()
            const e = this.parseExpr()
            this.expect('RPAREN')
            return e
        }
        throw new ParseError(`Unexpected token '${t.value}'`, t.line, t.col)
    }

    private parseNew(): Expr {
        const start = this.peek()
        this.advance()
        // Type name
        const t = this.peek()
        // May be primitive type int[] / int[][] / reference type String
        if (t.type === 'int' || t.type === 'double' || t.type === 'boolean' ||
            t.type === 'char' || t.type === 'String' || t.type === 'Integer' ||
            t.type === 'Double' || t.type === 'Boolean' || t.type === 'Object' ||
            t.type === 'Scanner' || t.type === 'ArrayList' || t.type === 'List' ||
            t.type === 'float' || t.type === 'long' || t.type === 'short' ||
            t.type === 'byte' || t.type === 'IDENT') {
            const typeName = this.advance().value
            // Skip generic parameters
            if (this.match('LT')) {
                let depth = 1
                this.advance()
                while (depth > 0 && !this.match('EOF')) {
                    const tt = this.advance().type
                    if (tt === 'LT') depth++
                    else if (tt === 'GT') depth--
                }
            }
            // Array form new int[3][4] {...}
            if (this.match('LBRACKET')) {
                const dims: Expr[] = []
                while (this.match('LBRACKET')) {
                    this.advance()
                    dims.push(this.parseExpr())
                    this.expect('RBRACKET')
                }
                let init: ArrayLitExpr | null = null
                if (this.match('LBRACE')) {
                    this.advance()
                    const elems: Expr[] = []
                    if (!this.match('RBRACE')) {
                        elems.push(this.parseExpr())
                        while (this.match('COMMA')) { this.advance(); elems.push(this.parseExpr()) }
                    }
                    this.expect('RBRACE')
                    init = { kind: 'ArrayLit', pos: start, elements: elems }
                }
                return { kind: 'NewArray', pos: start, elementType: typeName, dimensions: dims, initializer: init }
            }
            // Regular object creation
            this.expect('LPAREN')
            const args = this.parseArgList()
            this.expect('RPAREN')
            return { kind: 'NewObject', pos: start, className: typeName, args }
        }
        throw new ParseError(`Expected type name after 'new'`, t.line, t.col)
    }
}

// =============================================================
//  Runtime values / class table / scope
// =============================================================

// Java runtime values use JS primitives + wrapper objects
//   - Numeric: number (int and double unified as number; truncated by context at runtime)
//   - boolean: boolean
//   - char: string (single character)
//   - String: string
//   - Array: { __array: true, elementType, elements: JValue[] }
//   - Object: { __class: string, fields: Map<string, JValue> }

type JValue = number | boolean | string | null | JArray | JObject

interface JArray {
    __array: true
    elementType: string
    elements: JValue[]
    // 1-based length access, following Java convention: arr.length (not length())
}

interface JObject {
    __class: string
    fields: Map<string, JValue>
    [key: string]: any
}

const JNULL: JValue = null
function isJArray(v: JValue): v is JArray { return !!v && typeof v === 'object' && (v as any).__array === true }
function isJObject(v: JValue): v is JObject { return !!v && typeof v === 'object' && (v as any).__class }
function makeArray(elementType: string, elements: JValue[]): JArray {
    return { __array: true, elementType, elements }
}
function makeObject(className: string): JObject {
    return { __class: className, fields: new Map() }
}

interface JMethod {
    name: string
    isStatic: boolean
    returnType: string
    params: ParamNode[]
    body: BlockStmt
    owner: string
    // Unique key (used for overload resolution)
    key: string
}

interface JClass {
    name: string
    superClass: string | null
    interfaces: string[]
    staticFields: Map<string, { type: string; value: JValue }>
    instanceFieldNames: string[]         // All fields in the inheritance chain
    instanceFieldTypes: Map<string, string>
    instanceFieldDefaults: Map<string, Expr | null>
    methods: Map<string, JMethod>        // key = name$arity
    constructors: Map<string, { params: ParamNode[]; body: BlockStmt; superCall: SuperCallExpr | null; thisCall: ThisCallExpr | null; key: string }>
    isInterface: boolean
}

class Scope {
    parent: Scope | null
    vars = new Map<string, JValue>()
    varTypes = new Map<string, string>()
    constructor(parent: Scope | null = null) { this.parent = parent }
    define(name: string, value: JValue, type: string) { this.vars.set(name, value); this.varTypes.set(name, type) }
    get(name: string): JValue | undefined {
        for (let s: Scope | null = this; s; s = s.parent) {
            if (s.vars.has(name)) return s.vars.get(name)
        }
        return undefined
    }
    getType(name: string): string | undefined {
        for (let s: Scope | null = this; s; s = s.parent) {
            if (s.varTypes.has(name)) return s.varTypes.get(name)
        }
        return undefined
    }
    set(name: string, value: JValue): boolean {
        for (let s: Scope | null = this; s; s = s.parent) {
            if (s.vars.has(name)) { s.vars.set(name, value); return true }
        }
        return false
    }
}

// =============================================================
//  Interpreter
// =============================================================

class RuntimeError extends Error {
    constructor(msg: string, public line: number, public col: number) {
        super(`Error at ${line}:${col}: ${msg}`)
    }
}

class Interpreter {
    classes = new Map<string, JClass>()
    output: (s: string) => void
    inputLines: string[]
    inputIdx = 0
    inputTokens: string[] = []
    inputTokIdx = 0
    returnValue: JValue = null
    shouldReturn = false
    broke = false
    continued = false

    constructor(output: (s: string) => void, input: string) {
        this.output = output
        this.inputLines = (input || '').split(/\r?\n/)
    }

    private error(msg: string, pos?: Pos): never {
        throw new RuntimeError(msg, pos?.line ?? 0, pos?.col ?? 0)
    }

    run(program: ProgramNode) {
        // 1) Collect all classes
        for (const c of program.classes) this.registerClass(c)
        // 2) Resolve inheritance chain
        for (const c of this.classes.values()) this.resolveInheritance(c)
        // 3) Find the class containing the main method
        let mainClass: JClass | null = null
        for (const c of this.classes.values()) {
            for (const m of c.methods.values()) {
                if (m.name === 'main' && m.isStatic && m.returnType === 'void' && m.params.length === 1 && m.params[0].paramType === 'String[]') {
                    mainClass = c
                    break
                }
            }
            if (mainClass) break
        }
        if (!mainClass) throw new Error('No main method found (expected: public static void main(String[] args))')

        // 4) Invoke main
        const main = this.findMethod(mainClass, 'main', ['String[]'])!
        this.invokeStaticMethod(mainClass, main, [makeArray('String', [])])
    }

    private registerClass(node: ClassNode) {
        if (this.classes.has(node.name)) throw new Error(`Duplicate class '${node.name}'`)
        const c: JClass = {
            name: node.name,
            superClass: node.superClass,
            interfaces: node.interfaces,
            staticFields: new Map(),
            instanceFieldNames: [],
            instanceFieldTypes: new Map(),
            instanceFieldDefaults: new Map(),
            methods: new Map(),
            constructors: new Map(),
            isInterface: false,
        }
        for (const m of node.members) {
            if (m.kind === 'Field') {
                if (m.mods.isStatic) {
                    c.staticFields.set(m.name, { type: m.fieldType, value: m.init ? this.evalStaticInit(m.init, c) : this.defaultValue(m.fieldType) })
                } else {
                    c.instanceFieldNames.push(m.name)
                    c.instanceFieldTypes.set(m.name, m.fieldType)
                    c.instanceFieldDefaults.set(m.name, m.init)
                }
            } else if (m.kind === 'Method') {
                const key = m.name + '$' + m.params.length
                c.methods.set(key, {
                    name: m.name, isStatic: m.mods.isStatic, returnType: m.returnType,
                    params: m.params, body: m.body, owner: c.name, key,
                })
            } else if (m.kind === 'Constructor') {
                const key = '$ctor$' + m.params.length
                c.constructors.set(key, { params: m.params, body: m.body, superCall: m.superCall, thisCall: m.thisCall, key })
            }
        }
        this.classes.set(c.name, c)
    }

    // Static initialization uses a new temporary interpreter for evaluation (simplified: new object, no method visibility)
    private evalStaticInit(expr: Expr, c: JClass): JValue {
        const tmp = new StaticEval(this.classes, c)
        return tmp.eval(expr)
    }

    private defaultValue(t: string): JValue {
        if (t === 'int' || t === 'short' || t === 'long' || t === 'byte') return 0
        if (t === 'double' || t === 'float') return 0
        if (t === 'boolean') return false
        if (t === 'char') return '\0'
        if (t === 'String') return ''
        if (t.endsWith('[]')) return makeArray(t.slice(0, -2), [])
        return null
    }

    private resolveInheritance(c: JClass) {
        // Inherited fields
        if (c.superClass) {
            const sup = this.classes.get(c.superClass)
            if (!sup) throw new Error(`Unknown super class '${c.superClass}' for '${c.name}'`)
            this.resolveInheritance(sup)
            for (const f of sup.instanceFieldNames) {
                if (!c.instanceFieldTypes.has(f)) {
                    c.instanceFieldNames.push(f)
                    c.instanceFieldTypes.set(f, sup.instanceFieldTypes.get(f)!)
                    c.instanceFieldDefaults.set(f, sup.instanceFieldDefaults.get(f) ?? null)
                }
            }
            // Inherited methods
            for (const m of sup.methods.values()) {
                if (!c.methods.has(m.key)) c.methods.set(m.key, { ...m, owner: c.name })
            }
            for (const ct of sup.constructors.values()) {
                if (!c.constructors.has(ct.key)) c.constructors.set(ct.key, { ...ct })
            }
        }
    }

    private findMethod(c: JClass, name: string, argTypes: string[]): JMethod | null {
        // Simplified: match the first by method name + parameter count; for same name with different parameters, use the first match
        for (const m of c.methods.values()) {
            if (m.name !== name) continue
            if (m.params.length !== argTypes.length) continue
            return m
        }
        return null
    }

    private findConstructor(c: JClass, argCount: number) {
        for (const ct of c.constructors.values()) {
            if (ct.params.length === argCount) return ct
        }
        // No matching constructor and class has no explicit constructor → generate default no-arg constructor
        if (c.constructors.size === 0) {
            return { params: [], body: { kind: 'Block', pos: { line: 0, col: 0 }, stmts: [] }, superCall: { kind: 'SuperCall', pos: { line: 0, col: 0 }, args: [] }, thisCall: null, key: '$ctor$0' }
        }
        return null
    }

    private invokeStaticMethod(c: JClass, m: JMethod, args: JValue[]): JValue {
        const scope = new Scope(null)
        for (let i = 0; i < m.params.length; i++) {
            scope.define(m.params[i].name, args[i], m.params[i].paramType)
        }
        // Put all class static fields into scope (simplified handling)
        for (const [k, v] of c.staticFields) scope.define(k, v.value, v.type)
        const saved = { returnValue: this.returnValue, shouldReturn: this.shouldReturn, broke: this.broke, continued: this.continued }
        this.shouldReturn = false; this.returnValue = null; this.broke = false; this.continued = false
        this.execBlock(m.body, scope)
        const ret = this.returnValue
        Object.assign(this, saved)
        return ret
    }

    private invokeInstanceMethod(target: JObject, m: JMethod, args: JValue[]): JValue {
        const c = this.classes.get(target.__class)!
        const scope = new Scope(null)
        scope.define('this', target, c.name)
        for (let i = 0; i < m.params.length; i++) {
            scope.define(m.params[i].name, args[i], m.params[i].paramType)
        }
        const saved = { returnValue: this.returnValue, shouldReturn: this.shouldReturn, broke: this.broke, continued: this.continued }
        this.shouldReturn = false; this.returnValue = null; this.broke = false; this.continued = false
        this.execBlock(m.body, scope)
        const ret = this.returnValue
        Object.assign(this, saved)
        return ret
    }

    // ---- Type inference (rough) ----
    private inferType(e: Expr, scope: Scope): string {
        switch (e.kind) {
            case 'Lit': return e.litType
            case 'Binary': {
                const lt = this.inferType(e.left, scope)
                const rt = this.inferType(e.right, scope)
                if (lt === 'double' || rt === 'double') return 'double'
                if (e.op === '==' || e.op === '!=' || e.op === '<' || e.op === '>' || e.op === '<=' || e.op === '>=' || e.op === '&&' || e.op === '||') return 'boolean'
                if (lt === 'String' || rt === 'String') return 'String'
                if (lt === 'boolean' || rt === 'boolean') return 'boolean'
                return lt
            }
            case 'Unary': return this.inferType(e.operand, scope)
            case 'Ident': return scope.getType(e.name) || 'Object'
            case 'This': return 'this'
            case 'Call': {
                if (e.callee.kind === 'Member') {
                    const objT = this.inferType(e.callee.obj, scope)
                    const c = this.classes.get(objT)
                    if (c) {
                        const m = this.findMethod(c, e.callee.name, e.args.map(a => this.inferType(a, scope)))
                        if (m) return m.returnType
                    }
                }
                return 'Object'
            }
            case 'NewObject': return e.className
            case 'NewArray': return e.elementType + '[]'
            case 'Member': return 'Object'
            case 'Index': return 'Object'
            case 'Ternary': return this.inferType(e.then, scope)
            default: return 'Object'
        }
    }

    // ---- Evaluation helpers ----
    private toInt(v: JValue): number { return typeof v === 'number' ? Math.trunc(v) : 0 }
    private toNum(v: JValue): number { return typeof v === 'number' ? v : Number(v) || 0 }
    private toBool(v: JValue): boolean { return !!v }
    private toStr(v: JValue): string {
        if (v === null) return 'null'
        if (typeof v === 'string') return v
        if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(v)
        if (typeof v === 'boolean') return v ? 'true' : 'false'
        if (isJArray(v)) {
            const parts = v.elements.map(x => this.toStr(x))
            return '[' + parts.join(', ') + ']'
        }
        if (isJObject(v)) {
            const parts: string[] = []
            for (const [k, val] of v.fields) parts.push(`${k}=${this.toStr(val)}`)
            return `${v.__class}{${parts.join(', ')}}`
        }
        return String(v)
    }

    private unwrap(v: JValue): any { return v }

    // ---- Execute statements ----
    private execBlock(b: BlockStmt, scope: Scope): void {
        const inner = new Scope(scope)
        for (const s of b.stmts) {
            this.execStmt(s, inner)
            if (this.shouldReturn || this.broke || this.continued) break
        }
    }

    private execStmt(s: Stmt, scope: Scope): void {
        if (this.shouldReturn || this.broke || this.continued) return
        switch (s.kind) {
            case 'Block': this.execBlock(s, scope); return
            case 'Empty': return
            case 'VarDecl': this.execVarDecl(s, scope); return
            case 'ExprStmt': this.evalExpr(s.expr, scope); return
            case 'If': {
                if (this.toBool(this.evalExpr(s.cond, scope))) this.execStmt(s.then, scope)
                else if (s.else) this.execStmt(s.else, scope)
                return
            }
            case 'While': {
                while (!this.shouldReturn && !this.broke && this.toBool(this.evalExpr(s.cond, scope))) {
                    this.broke = false; this.continued = false
                    this.execStmt(s.body, scope)
                }
                this.broke = false
                return
            }
            case 'DoWhile': {
                do {
                    this.broke = false; this.continued = false
                    this.execStmt(s.body, scope)
                } while (!this.broke && !this.shouldReturn && this.toBool(this.evalExpr(s.cond, scope)))
                if (this.broke) this.broke = false
                return
            }
            case 'For': {
                const inner = new Scope(scope)
                if (s.init) this.execStmt(s.init, inner)
                while (!this.shouldReturn && !this.broke) {
                    if (s.cond && !this.toBool(this.evalExpr(s.cond, inner))) break
                    this.broke = false; this.continued = false
                    this.execStmt(s.body, inner)
                    if (!this.broke && !this.shouldReturn && s.update) this.evalExpr(s.update, inner)
                }
                this.broke = false
                return
            }
            case 'ForEach': {
                const iter = this.evalExpr(s.iter, scope)
                if (!isJArray(iter)) throw new Error(`for-each requires an array`)
                for (const el of iter.elements) {
                    if (this.shouldReturn || this.broke) break
                    const inner = new Scope(scope)
                    inner.define(s.name, el, s.varType)
                    this.broke = false; this.continued = false
                    this.execStmt(s.body, inner)
                }
                this.broke = false
                return
            }
            case 'Return':
                this.returnValue = s.value ? this.evalExpr(s.value, scope) : null
                this.shouldReturn = true
                return
            case 'Break': this.broke = true; return
            case 'Continue': this.continued = true; this.broke = true; return
            case 'Switch': {
                const v = this.evalExpr(s.target, scope)
                let matched = false
                for (const c of s.cases) {
                    for (const cv of c.values) {
                        if (this.toNum(this.evalExpr(cv, scope)) === this.toNum(v)) {
                            matched = true
                            for (const ss of c.body) {
                                this.execStmt(ss, scope)
                                if (this.shouldReturn || this.broke || this.continued) return
                            }
                            break
                        }
                    }
                    if (matched || this.shouldReturn || this.broke || this.continued) break
                }
                if (!matched && s.default) {
                    for (const ss of s.default) {
                        this.execStmt(ss, scope)
                        if (this.shouldReturn || this.broke || this.continued) return
                    }
                }
                return
            }
            case 'Try': {
                let caught = false
                try {
                    this.execBlock(s.tryBlock, scope)
                } catch (e: any) {
                    caught = true
                    // Select matching catch
                    for (const cc of s.catches) {
                        if (this.isInstanceOf(e, cc.exType)) {
                            const inner = new Scope(scope)
                            inner.define(cc.name, e, cc.exType)
                            this.execBlock(cc.body, inner)
                            break
                        }
                    }
                } finally {
                    if (s.finallyBlock) this.execBlock(s.finallyBlock, scope)
                }
                if (caught && !s.catches.length && !s.finallyBlock) throw new Error('Unhandled exception in try')
                return
            }
            case 'Throw': {
                const v = this.evalExpr(s.expr, scope)
                throw v
            }
        }
    }

    private isInstanceOf(e: any, t: string): boolean {
        if (e === null || e === undefined) return false
        if (t === 'Exception' || t === 'RuntimeException' || t === 'Throwable') {
            return isJObject(e) || e instanceof Error
        }
        if (!isJObject(e)) return false
        let cur: string | null = e.__class
        while (cur) {
            if (cur === t) return true
            const c = this.classes.get(cur)
            cur = c?.superClass ?? null
        }
        return false
    }

    private execVarDecl(s: VarDeclStmt, scope: Scope) {
        let v: JValue = this.defaultValue(s.varType)
        if (s.init) v = this.evalExpr(s.init, scope)
        scope.define(s.name, v, s.varType)
    }

    // ---- Expression evaluation ----
    private evalExpr(e: Expr, scope: Scope): JValue {
        switch (e.kind) {
            case 'Lit': return e.value
            case 'Ident': {
                // Search along the scope chain (including grandparent scopes), do not just look at current/parent scope
                const v = scope.get(e.name)
                if (v !== undefined) return v
                // Class name as identifier: return null
                if (this.classes.has(e.name)) return null
                throw new Error(`Undefined variable '${e.name}'`)
            }
            case 'This': return scope.get('this')!
            case 'Super': return scope.get('this')!  // Simplified: super treated as this
            case 'Binary': return this.evalBinary(e, scope)
            case 'Unary': return this.evalUnary(e, scope)
            case 'PrePost': return this.evalPrePost(e, scope)
            case 'Ternary': return this.toBool(this.evalExpr(e.cond, scope)) ? this.evalExpr(e.then, scope) : this.evalExpr(e.else, scope)
            case 'Assign': return this.evalAssign(e, scope)
            case 'Call': return this.evalCall(e, scope)
            case 'Member': return this.evalMember(e, scope)
            case 'Index': return this.evalIndex(e, scope)
            case 'NewObject': return this.evalNewObject(e, scope)
            case 'NewArray': return this.evalNewArray(e, scope)
            case 'ArrayLit': return makeArray('Object', e.elements.map(x => this.evalExpr(x, scope)))
            case 'Cast': return this.evalCast(e, scope)
            case 'InstanceOf': {
                const v = this.evalExpr(e.expr, scope)
                return this.isInstanceOf(v, e.checkType)
            }
            case 'SuperCall': {
                const this_ = scope.get('this') as JObject
                const supName = this.classes.get(this_.__class)!.superClass
                if (!supName) throw new Error('No super class')
                const sup = this.classes.get(supName)!
                const ct = this.findConstructor(sup, e.args.length)!
                return this.invokeConstructor(sup, ct, e.args.map(a => this.evalExpr(a, scope)), this_)
            }
            case 'ThisCall': {
                const this_ = scope.get('this') as JObject
                const c = this.classes.get(this_.__class)!
                const ct = this.findConstructor(c, e.args.length)!
                return this.invokeConstructor(c, ct, e.args.map(a => this.evalExpr(a, scope)), this_)
            }
        }
        return null
    }

    private evalBinary(e: BinaryExpr, scope: Scope): JValue {
        const l = this.evalExpr(e.left, scope)
        const r = this.evalExpr(e.right, scope)
        const lt = this.inferType(e.left, scope)
        const rt = this.inferType(e.right, scope)
        const isDouble = lt === 'double' || rt === 'double' || lt === 'float' || rt === 'float'
        switch (e.op) {
            case '+':
                if (lt === 'String' || rt === 'String' || typeof l === 'string' || typeof r === 'string') return this.toStr(l) + this.toStr(r)
                if (lt === 'char' || rt === 'char') return String(l) + String(r)
                if (isDouble) return this.toNum(l) + this.toNum(r)
                return this.toInt(l) + this.toInt(r)
            case '-': return isDouble ? this.toNum(l) - this.toNum(r) : this.toInt(l) - this.toInt(r)
            case '*': return isDouble ? this.toNum(l) * this.toNum(r) : this.toInt(l) * this.toInt(r)
            case '/': {
                if (isDouble) {
                    const d = this.toNum(r)
                    if (d === 0) throw new Error('ArithmeticException: / by zero')
                    return this.toNum(l) / d
                }
                const d = this.toInt(r)
                if (d === 0) throw new Error('ArithmeticException: / by zero')
                return Math.trunc(this.toInt(l) / d)
            }
            case '%': {
                if (isDouble) {
                    const d = this.toNum(r)
                    if (d === 0) throw new Error('ArithmeticException: / by zero')
                    return this.toNum(l) % d
                }
                const d = this.toInt(r)
                if (d === 0) throw new Error('ArithmeticException: / by zero')
                return this.toInt(l) % d
            }
            case '<': return isDouble ? this.toNum(l) < this.toNum(r) : this.toInt(l) < this.toInt(r)
            case '>': return isDouble ? this.toNum(l) > this.toNum(r) : this.toInt(l) > this.toInt(r)
            case '<=': return isDouble ? this.toNum(l) <= this.toNum(r) : this.toInt(l) <= this.toInt(r)
            case '>=': return isDouble ? this.toNum(l) >= this.toNum(r) : this.toInt(l) >= this.toInt(r)
            case '==': return this.deepEq(l, r)
            case '!=': return !this.deepEq(l, r)
            case '&&': return this.toBool(l) && this.toBool(r)
            case '||': return this.toBool(l) || this.toBool(r)
            case '&': return isDouble ? this.toInt(l) & this.toInt(r) : this.toInt(l) & this.toInt(r)
            case '|': return isDouble ? this.toInt(l) | this.toInt(r) : this.toInt(l) | this.toInt(r)
            case '^': return isDouble ? this.toInt(l) ^ this.toInt(r) : this.toInt(l) ^ this.toInt(r)
            case '<<': return this.toInt(l) << this.toInt(r)
            case '>>': return this.toInt(l) >> this.toInt(r)
            case '>>>': return this.toInt(l) >>> this.toInt(r)
        }
        throw new Error(`Unknown binary op '${e.op}'`)
    }

    private deepEq(a: JValue, b: JValue): boolean {
        if (a === b) return true
        if (a === null || b === null) return false
        if (typeof a === 'string' || typeof b === 'string') return a === b
        if (typeof a === 'number' && typeof b === 'number') return a === b
        if (typeof a === 'boolean' && typeof b === 'boolean') return a === b
        if (isJArray(a) && isJArray(b)) {
            if (a.elements.length !== b.elements.length) return false
            for (let i = 0; i < a.elements.length; i++) if (!this.deepEq(a.elements[i], b.elements[i])) return false
            return true
        }
        if (isJObject(a) && isJObject(b)) return a === b  // Object comparison by reference
        return false
    }

    private evalUnary(e: UnaryExpr, scope: Scope): JValue {
        const v = this.evalExpr(e.operand, scope)
        switch (e.op) {
            case '+': return +this.toNum(v)
            case '-': return -this.toNum(v)
            case '!': return !this.toBool(v)
            case '~': return ~this.toInt(v)
        }
        return v
    }

    private evalPrePost(e: PrePostExpr, scope: Scope): JValue {
        if (e.target.kind !== 'Ident' && e.target.kind !== 'Member' && e.target.kind !== 'Index') {
            throw new Error('++/-- target must be assignable')
        }
        const oldV = this.evalExpr(e.target, scope)
        const t = this.inferType(e.target, scope)
        const isDouble = t === 'double' || t === 'float'
        const newV = isDouble ? (e.op === '++' ? this.toNum(oldV) + 1 : this.toNum(oldV) - 1) : (e.op === '++' ? this.toInt(oldV) + 1 : this.toInt(oldV) - 1)
        this.assignTo(e.target, newV, scope)
        return e.prefix ? newV : oldV
    }

    private evalAssign(e: AssignExpr, scope: Scope): JValue {
        const v = this.evalExpr(e.value, scope)
        if (e.op === '=') { this.assignTo(e.target, v, scope); return v }
        // Compound assignment
        this.evalExpr(e.target, scope) // Read old value (for side effects)
        const lt = this.inferType(e.target, scope)
        const isDouble = lt === 'double' || lt === 'float'
        const op = e.op.slice(0, -1)  // += → +
        const expr: Expr = { kind: 'Binary', pos: e.pos, op, left: e.target, right: e.value }
        const r = this.evalExpr(expr, scope)
        if (op === '/' || op === '%') {
            const divisor = isDouble ? this.toNum(v) : this.toInt(v)
            if (divisor === 0) throw new Error('ArithmeticException: / by zero')
        }
        this.assignTo(e.target, r, scope)
        return r
    }

    private assignTo(target: Expr, v: JValue, scope: Scope) {
        if (target.kind === 'Ident') {
            if (!scope.set(target.name, v)) throw new Error(`Cannot assign to undefined variable '${target.name}'`)
        } else if (target.kind === 'Member') {
            const obj = this.evalExpr(target.obj, scope)
            if (!isJObject(obj)) throw new Error('Member access on non-object')
            obj.fields.set(target.name, v)
        } else if (target.kind === 'Index') {
            const arr = this.evalExpr(target.target, scope)
            const idx = this.toInt(this.evalExpr(target.index, scope))
            if (!isJArray(arr)) throw new Error('Index access on non-array')
            arr.elements[idx] = v
        } else {
            throw new Error('Invalid assignment target')
        }
    }

    private evalMember(e: MemberExpr, scope: Scope): JValue {
        // Static access like System.out / System.in → return a pseudo object (simulated with a plain object)
        if (e.obj.kind === 'Ident') {
            if (e.obj.name === 'System' && e.name === 'out') {
                return { __class: '__SystemOut__', fields: new Map() }
            }
            if (e.obj.name === 'System' && e.name === 'in') {
                return { __class: '__SystemIn__', fields: new Map() }
            }
        }
        const obj = this.evalExpr(e.obj, scope)
        if (!isJObject(obj)) {
            // Array .length / string .length
            if (e.name === 'length') {
                if (isJArray(obj)) return obj.elements.length
                if (typeof obj === 'string') return obj.length
            }
            throw new Error(`Cannot read member '${e.name}' on non-object`)
        }
        return obj.fields.get(e.name) ?? null
    }

    private evalIndex(e: IndexExpr, scope: Scope): JValue {
        const arr = this.evalExpr(e.target, scope)
        const idx = this.toInt(this.evalExpr(e.index, scope))
        if (typeof arr === 'string') return arr.charAt(idx)
        if (!isJArray(arr)) throw new Error('Index access on non-array')
        if (idx < 0 || idx >= arr.elements.length) throw new Error(`ArrayIndexOutOfBoundsException: ${idx}`)
        return arr.elements[idx]
    }

    private evalNewObject(e: NewObjectExpr, scope: Scope): JValue {
        // Built-in class handling
        if (e.className === 'Scanner') {
            // tokens stored as JArray to avoid conflict with JValue type
            const tokens = this.tokenizeInput().tokens
            const fields = new Map<string, JValue>()
            fields.set('tokens', makeArray('String', tokens))
            return { __isScanner: true, __class: '__Scanner__', fields }
        }
        if (e.className === 'ArrayList') {
            return makeArray('Object', [])
        }
        if (e.className === 'String' && e.args.length === 1) {
            return this.toStr(this.evalExpr(e.args[0], scope))
        }
        if (e.className === 'Integer' && e.args.length === 1) {
            return this.toInt(this.evalExpr(e.args[0], scope))
        }
        if (e.className === 'Double' && e.args.length === 1) {
            return this.toNum(this.evalExpr(e.args[0], scope))
        }
        if (e.className === 'Boolean' && e.args.length === 1) {
            return this.toBool(this.evalExpr(e.args[0], scope))
        }
        const c = this.classes.get(e.className)
        if (!c) throw new Error(`Unknown class '${e.className}'`)
        const obj = makeObject(c.name)
        // Initialize instance field default values
        for (const f of c.instanceFieldNames) {
            const def = c.instanceFieldDefaults.get(f)
            obj.fields.set(f, def ? this.evalStaticInit(def, c) : this.defaultValue(c.instanceFieldTypes.get(f)!))
        }
        const ct = this.findConstructor(c, e.args.length)
        if (!ct) throw new Error(`No constructor matching ${e.args.length} args in '${c.name}'`)
        this.invokeConstructor(c, ct, e.args.map(a => this.evalExpr(a, scope)), obj)
        return obj
    }

    private invokeConstructor(c: JClass, ct: any, args: JValue[], thisObj: JObject): JValue {
        const scope = new Scope(null)
        scope.define('this', thisObj, c.name)
        for (let i = 0; i < ct.params.length; i++) scope.define(ct.params[i].name, args[i], ct.params[i].paramType)
        if (ct.superCall) {
            // Call super class constructor
            const supName = c.superClass
            if (supName) {
                const sup = this.classes.get(supName)!
                const supCt = this.findConstructor(sup, ct.superCall.args.length)
                if (supCt) {
                    this.invokeConstructor(sup, supCt, ct.superCall.args.map((a: Expr) => this.evalExpr(a, scope)), thisObj)
                }
            }
        }
        if (ct.thisCall) {
            // Call another constructor of this class
            const otherCt = this.findConstructor(c, ct.thisCall.args.length)
            if (otherCt) {
                this.invokeConstructor(c, otherCt, ct.thisCall.args.map((a: Expr) => this.evalExpr(a, scope)), thisObj)
            }
        }
        this.execBlock(ct.body, scope)
        return thisObj
    }

    private evalNewArray(e: NewArrayExpr, scope: Scope): JValue {
        const dims = e.dimensions.map(d => this.toInt(this.evalExpr(d, scope)))
        if (e.initializer) {
            return makeArray(e.elementType, e.initializer.elements.map(x => this.evalExpr(x, scope)))
        }
        // Create multi-dimensional array (recursive construction)
        const create = (dimIdx: number): JValue[] => {
            if (dimIdx === dims.length) return []
            const size = dims[dimIdx]
            const arr: JValue[] = new Array(size)
            if (dimIdx === dims.length - 1) {
                for (let i = 0; i < size; i++) arr[i] = this.defaultValue(e.elementType)
            } else {
                const subType = e.elementType
                for (let i = 0; i < size; i++) arr[i] = makeArray(subType, create(dimIdx + 1))
            }
            return arr
        }
        return makeArray(e.elementType, create(0))
    }

    private evalCall(e: CallExpr, scope: Scope): JValue {
        // Built-in: Math.xxx
        if (e.callee.kind === 'Member' && e.callee.obj.kind === 'Ident' && e.callee.obj.name === 'Math') {
            return this.callMath(e.callee.name, e.args.map(a => this.evalExpr(a, scope)))
        }
        // System.out.println / print -> identified by the __class of the out pseudo object
        const calleeObj = e.callee.kind === 'Member' ? this.evalExpr(e.callee.obj, scope) : null
        if (e.callee.kind === 'Member' && isJObject(calleeObj) && calleeObj.__class === '__SystemOut__') {
            return this.callSystemOut(e.callee.name, e.args.map(a => this.evalExpr(a, scope)))
        }
        // Scanner methods (pseudo object __isScanner flag)
        if (e.callee.kind === 'Member' && isJObject(calleeObj) && (calleeObj as any).__isScanner) {
            return this.callScanner(calleeObj, e.callee.name, e.args.map(a => this.evalExpr(a, scope)))
        }
        // String instance methods
        if (e.callee.kind === 'Member' && typeof calleeObj === 'string') {
            return this.callString(calleeObj, e.callee.name, e.args.map(a => this.evalExpr(a, scope)))
        }
        // ArrayList instance methods
        if (e.callee.kind === 'Member' && isJArray(calleeObj) && calleeObj.elementType === 'Object' && ARRAYLIST_METHODS.has(e.callee.name)) {
            return this.callArrayList(calleeObj, e.callee.name, e.args.map(a => this.evalExpr(a, scope)))
        }
        // Regular method call
        const methodName = e.callee.kind === 'Member' ? e.callee.name : (e.callee as any).name
        const argValues = e.args.map(a => this.evalExpr(a, scope))
        const argTypes = e.args.map(a => this.inferType(a, scope))

        if (calleeObj === null || calleeObj === undefined) {
            // Static method / global method
            const thisObj = scope.get('this') as JObject | undefined
            let c: JClass | null = null
            if (thisObj) c = this.classes.get(thisObj.__class) || null
            if (!c) {
                for (const cc of this.classes.values()) {
                    if (cc.methods.has(methodName + '$' + argValues.length)) { c = cc; break }
                }
            }
            if (!c) throw new Error(`Method '${methodName}' not found`)
            const m = this.findMethod(c, methodName, argTypes)
            if (!m) throw new Error(`No method '${methodName}' matching ${argValues.length} args`)
            return this.invokeStaticMethod(c, m, argValues)
        }
        if (isJObject(calleeObj)) {
            const c = this.classes.get(calleeObj.__class)!
            const m = this.findMethod(c, methodName, argTypes)
            if (!m) throw new Error(`No method '${methodName}' on '${c.name}'`)
            return this.invokeInstanceMethod(calleeObj, m, argValues)
        }
        throw new Error(`Cannot call '${methodName}' on non-object`)
    }

    // ---- Built-in class support ----
    private callMath(name: string, args: JValue[]): JValue {
        switch (name) {
            case 'abs': return Math.abs(this.toNum(args[0]))
            case 'max': return Math.max(this.toNum(args[0]), this.toNum(args[1]))
            case 'min': return Math.min(this.toNum(args[0]), this.toNum(args[1]))
            case 'sqrt': return Math.sqrt(this.toNum(args[0]))
            case 'pow': return Math.pow(this.toNum(args[0]), this.toNum(args[1]))
            case 'random': return Math.random()
            case 'round': return Math.round(this.toNum(args[0]))
            case 'floor': return Math.floor(this.toNum(args[0]))
            case 'ceil': return Math.ceil(this.toNum(args[0]))
            case 'log': return Math.log(this.toNum(args[0]))
            case 'sin': return Math.sin(this.toNum(args[0]))
            case 'cos': return Math.cos(this.toNum(args[0]))
            case 'tan': return Math.tan(this.toNum(args[0]))
        }
        throw new Error(`Math.${name} not supported`)
    }

    private callSystemOut(name: string, args: JValue[]): JValue {
        if (name === 'print') {
            this.output(this.toStr(args[0]))
            return null
        }
        if (name === 'println') {
            if (args.length === 0) this.output('\n')
            else this.output(this.toStr(args[0]) + '\n')
            return null
        }
        if (name === 'printf') {
            this.output(this.format(args[0] as string, args.slice(1)))
            return null
        }
        throw new Error(`System.out.${name} not supported`)
    }

    // Minimal printf: %d %s %f %n %%
    private format(fmt: string, args: JValue[]): string {
        let i = 0
        let out = ''
        let a = 0
        while (i < fmt.length) {
            const c = fmt[i]
            if (c === '%' && i + 1 < fmt.length) {
                const n = fmt[i + 1]
                if (n === '%') { out += '%'; i += 2; continue }
                if (n === 'n') { out += '\n'; i += 2; continue }
                if (n === 'd') { out += String(this.toInt(args[a++] ?? 0)); i += 2; continue }
                if (n === 's') { out += this.toStr(args[a++] ?? ''); i += 2; continue }
                if (n === 'f') { out += String(this.toNum(args[a++] ?? 0)); i += 2; continue }
                if (n === 'x') { out += (this.toInt(args[a++] ?? 0)).toString(16); i += 2; continue }
                if (n === 'o') { out += (this.toInt(args[a++] ?? 0)).toString(8); i += 2; continue }
                if (n === 'c') { out += String.fromCharCode(this.toInt(args[a++] ?? 0)); i += 2; continue }
            }
            out += c; i++
        }
        return out
    }

    private callString(s: string, name: string, args: JValue[]): JValue {
        switch (name) {
            case 'length': return s.length
            case 'isEmpty': return s.length === 0
            case 'charAt': return s.charAt(this.toInt(args[0]))
            case 'substring': {
                const a = this.toInt(args[0])
                if (args.length === 1) return s.substring(a)
                const b = this.toInt(args[1])
                return s.substring(a, b)
            }
            case 'indexOf': {
                const t = this.toStr(args[0])
                return s.indexOf(t)
            }
            case 'lastIndexOf': return s.lastIndexOf(this.toStr(args[0]))
            case 'contains': return s.includes(this.toStr(args[0]))
            case 'startsWith': return s.startsWith(this.toStr(args[0]))
            case 'endsWith': return s.endsWith(this.toStr(args[0]))
            case 'equals': return s === this.toStr(args[0])
            case 'equalsIgnoreCase': return s.toLowerCase() === this.toStr(args[0]).toLowerCase()
            case 'compareTo': {
                const t = this.toStr(args[0])
                if (s < t) return -1
                if (s > t) return 1
                return 0
            }
            case 'toLowerCase': return s.toLowerCase()
            case 'toUpperCase': return s.toUpperCase()
            case 'trim': return s.trim()
            case 'replace': {
                const a = this.toStr(args[0])
                const b = this.toStr(args[1])
                return s.split(a).join(b)
            }
            case 'split': {
                const sep = this.toStr(args[0])
                return makeArray('String', s.split(sep).map(x => x))
            }
            case 'concat': return s + this.toStr(args[0])
            case 'valueOf': return this.toStr(args[0])
            case 'toCharArray': return makeArray('char', s.split('').map(c => c))
            case 'toString': return s
        }
        throw new Error(`String.${name} not supported`)
    }

    private callScanner(sc: any, name: string, _args: JValue[]): JValue {
        // tokens field is in JObject.fields Map, not a direct property
        const tokensField = sc.fields?.get('tokens')
        const tokens: JValue[] = isJArray(tokensField) ? tokensField.elements : []
        switch (name) {
            case 'nextInt': return this.toInt(tokens[this.inputTokIdx++] ?? '0')
            case 'nextDouble': return this.toNum(tokens[this.inputTokIdx++] ?? '0')
            case 'nextLong': return this.toInt(tokens[this.inputTokIdx++] ?? '0')
            case 'next': return tokens[this.inputTokIdx++] ?? ''
            case 'nextLine': {
                if (this.inputIdx >= this.inputLines.length) return ''
                return this.inputLines[this.inputIdx++]
            }
            case 'hasNext': return this.inputTokIdx < tokens.length || this.inputIdx < this.inputLines.length
            case 'hasNextInt': return this.inputTokIdx < tokens.length
            case 'close': return null
        }
        throw new Error(`Scanner.${name} not supported`)
    }

    private tokenizeInput(): { tokens: string[] } {
        const tokens: string[] = []
        for (const line of this.inputLines) {
            // Split by whitespace
            const parts = line.trim().split(/\s+/)
            for (const p of parts) if (p) tokens.push(p)
        }
        return { tokens }
    }

    private callArrayList(arr: JArray, name: string, args: JValue[]): JValue {
        switch (name) {
            case 'add': arr.elements.push(args[0]); return true
            case 'addAll':
                if (isJArray(args[0])) {
                    for (const x of args[0].elements) arr.elements.push(x)
                }
                return true
            case 'get': return arr.elements[this.toInt(args[0])]
            case 'set': arr.elements[this.toInt(args[0])] = args[1]; return args[1]
            case 'size': return arr.elements.length
            case 'isEmpty': return arr.elements.length === 0
            case 'clear': arr.elements = []; return null
            case 'remove': {
                const idx = this.toInt(args[0])
                if (idx < 0 || idx >= arr.elements.length) throw new Error('IndexOutOfBoundsException')
                const [removed] = arr.elements.splice(idx, 1)
                return removed
            }
            case 'contains': return arr.elements.some(x => this.deepEq(x, args[0]))
            case 'indexOf': return arr.elements.findIndex(x => this.deepEq(x, args[0]))
            case 'toString': return '[' + arr.elements.map(x => this.toStr(x)).join(', ') + ']'
        }
        throw new Error(`ArrayList.${name} not supported`)
    }

    private evalCast(e: CastExpr, scope: Scope): JValue {
        const v = this.evalExpr(e.expr, scope)
        switch (e.targetType) {
            case 'int': return this.toInt(v)
            case 'double': return this.toNum(v)
            case 'float': return this.toNum(v)
            case 'long': return this.toInt(v)
            case 'short': return this.toInt(v)
            case 'byte': return this.toInt(v)
            case 'char': return String(this.toInt(v))
            case 'boolean': return this.toBool(v)
            case 'String': return this.toStr(v)
        }
        return v
    }
}

const ARRAYLIST_METHODS: Set<string> = new Set([
    'add', 'addAll', 'get', 'set', 'size', 'isEmpty',
    'clear', 'remove', 'contains', 'indexOf', 'toString',
])

// For static initialization: read-only class fields, no method support
class StaticEval {
    constructor(public classes: Map<string, JClass>, public currentClass: JClass) {}
    eval(e: Expr): JValue {
        switch (e.kind) {
            case 'Lit': return e.value
            case 'Ident': {
                if (this.currentClass.staticFields.has(e.name)) return this.currentClass.staticFields.get(e.name)!.value
                return null
            }
            case 'Binary': {
                const l = this.eval(e.left), r = this.eval(e.right)
                switch (e.op) {
                    case '+': return Number(l) + Number(r)
                    case '-': return Number(l) - Number(r)
                    case '*': return Number(l) * Number(r)
                    case '/': return Math.trunc(Number(l) / Number(r))
                    case '%': return Number(l) % Number(r)
                }
                return 0
            }
            case 'Unary':
                if (e.op === '-') return -Number(this.eval(e.operand))
                if (e.op === '!') return !this.eval(e.operand)
                return this.eval(e.operand)
            case 'Call':
                // Static method call (uncommon, simplified)
                if (e.callee.kind === 'Member' && e.callee.obj.kind === 'Ident' && e.callee.obj.name === 'Math') {
                    const args = e.args.map(a => this.eval(a))
                    switch (e.callee.name) {
                        case 'abs': return Math.abs(Number(args[0]))
                        case 'max': return Math.max(Number(args[0]), Number(args[1]))
                        case 'min': return Math.min(Number(args[0]), Number(args[1]))
                        case 'sqrt': return Math.sqrt(Number(args[0]))
                        case 'pow': return Math.pow(Number(args[0]), Number(args[1]))
                    }
                }
                return null
            case 'NewArray': {
                const dims = e.dimensions.map(d => Math.trunc(Number(this.eval(d))))
                const out: JValue[] = new Array(dims[0] || 0)
                for (let i = 0; i < out.length; i++) out[i] = 0
                return makeArray(e.elementType, out)
            }
            case 'ArrayLit': return makeArray('Object', e.elements.map(x => this.eval(x)))
        }
        return null
    }
}

// =============================================================
//  Runner entry (aligned with the Runner interface in types.ts)
// =============================================================

export function createJavaRunner(): Runner {
    const ready = ref(true)  // Pure JS interpreter, no need to async load runtime
    const loadingLabel = ''

    async function init(): Promise<void> {
        // noop
    }

    async function run(ctx: RunContext): Promise<void> {
        try {
            const tokens = tokenize(ctx.code)
            const parser = new Parser(tokens)
            const program = parser.parse()
            const interp = new Interpreter((s) => ctx.onOutput(s), ctx.input)
            interp.run(program)
        } catch (e: any) {
            ctx.onOutput(`\n${e.message || e}\n`)
        }
    }

    return { name: 'java', ready, loadingLabel, init, run }
}

