/**
 * 配对示例：同一程序提供「伪代码版」与「Python 版」两套，
 * 用于验证 psToPy / pyToPs 双向互转。分模块导出。
 * 用法：
 *   import { pairs } from "./examples/pairs.mjs";
 *   每项 = [名称, 方言, 伪代码版, Python 版]
 */

export const pairs = [
  // ---------- IGCSE ----------
  [
    "hello",
    "IGCSE",
    `OUTPUT "Hello, World"`,
    `print("Hello, World")`,
  ],
  [
    "variables+io",
    "IGCSE",
    `DECLARE Name:STRING
DECLARE Age:INTEGER
Name <- "Jack"
Age <- 18
INPUT Name
INPUT Age
OUTPUT Name, Age`,
    `Name = None
Age = None
Name = "Jack"
Age = 18
Name = input()
Age = input()
print(Name, Age)`,
  ],
  [
    "ifelse",
    "IGCSE",
    `DECLARE Age:INTEGER
INPUT Age
IF Age >= 18 THEN
  OUTPUT "Adult"
ELSE
  OUTPUT "Child"
ENDIF`,
    `Age = None
Age = input()
if Age >= 18:
    print("Adult")
else:
    print("Child")`,
  ],
  [
    "forloop",
    "IGCSE",
    `DECLARE Index:INTEGER
FOR Index <- 1 TO 10
  OUTPUT Index*Index
NEXT Index`,
    `Index = None
for Index in range(1, 10 + 1):
    print(Index * Index)`,
  ],
  [
    "whileloop",
    "IGCSE",
    `DECLARE Index:INTEGER
Index <- 1
WHILE Index <= 10 DO
  OUTPUT Index*Index
  Index <- Index + 1
ENDWHILE`,
    `Index = None
Index = 1
while Index <= 10:
    print(Index * Index)
    Index = Index + 1`,
  ],
  [
    "repeatloop",
    "IGCSE",
    `DECLARE Index:INTEGER
Index <- 1
REPEAT
  OUTPUT Index*Index
  Index <- Index + 1
UNTIL Index > 10`,
    `Index = None
Index = 1
while True:
    print(Index * Index)
    Index = Index + 1
    if Index > 10:
        break`,
  ],
  [
    "array",
    "IGCSE",
    `DECLARE Scores:ARRAY[1:3] OF INTEGER
Scores[1] <- 5
OUTPUT Scores[1]`,
    `Scores = [0] * 3
Scores[1 - 1] = 5
print(Scores[1 - 1])`,
  ],
  [
    "procedure",
    "IGCSE",
    `PROCEDURE Greeting(Name : STRING)
  OUTPUT "Hello", Name
ENDPROCEDURE
CALL Greeting("Oldmoon")`,
    `def Greeting(Name):
    print("Hello", Name)

Greeting("Oldmoon")`,
  ],
  [
    "function",
    "IGCSE",
    `FUNCTION Abs(Number : INTEGER) RETURNS INTEGER
  IF Number < 0 THEN
    Number <- -Number
  ENDIF
  RETURN Number
ENDFUNCTION
DECLARE Num:INTEGER
INPUT Num
OUTPUT Abs(Num)`,
    `def Abs(Number):
    if Number < 0:
        Number = -Number
    return Number

Num = None
Num = input()
print(Abs(Num))`,
  ],
  [
    "file",
    "IGCSE",
    `OPENFILE "a.txt" FOR READ
DECLARE Line:STRING
READFILE "a.txt", Line
OUTPUT Line
CLOSEFILE "a.txt"`,
    `_f1 = open("a.txt", "r")
Line = None
Line = _f1.readline()
print(Line)
_f1.close()`,
  ],

  // ---------- ALEVEL ----------
  [
    "a_hello",
    "ALEVEL",
    `OUTPUT "Hello, World"`,
    `print("Hello, World")`,
  ],
  [
    "a_if",
    "ALEVEL",
    `DECLARE Age : INTEGER
INPUT Age
IF Age >= 18 THEN
  OUTPUT "Adult"
ELSE
  OUTPUT "Child"
ENDIF`,
    `Age = None
Age = input()
if Age >= 18:
    print("Adult")
else:
    print("Child")`,
  ],
  [
    "a_divmod",
    "ALEVEL",
    `DECLARE Q:INTEGER
DECLARE R:INTEGER
Q <- 10 DIV 3
R <- 10 MOD 3
OUTPUT Q, R`,
    `Q = None
R = None
Q = 10 // 3
R = 10 % 3
print(Q, R)`,
  ],
  [
    "a_for",
    "ALEVEL",
    `DECLARE Index : INTEGER
FOR Index <- 1 TO 10
  OUTPUT Index * Index
NEXT Index`,
    `Index = None
for Index in range(1, 10 + 1):
    print(Index * Index)`,
  ],
  [
    "a_procedure_byref",
    "ALEVEL",
    `PROCEDURE SWAP(BYREF X : INTEGER, Y : INTEGER)
  DECLARE Tmp : INTEGER
  Tmp = X
  X = Y
  Y = Tmp
ENDPROCEDURE
DECLARE A : INTEGER
DECLARE B : INTEGER
A = 1
B = 2
CALL SWAP(A, B)
OUTPUT A, B`,
    `def SWAP(X, Y):
    Tmp = None
    Tmp = X
    X = Y
    Y = Tmp
    return X, Y

A = None
B = None
A = 1
B = 2
A, B = SWAP(A, B)
print(A, B)`,
  ],
  [
    "a_function",
    "ALEVEL",
    `FUNCTION Max(Number1 : INTEGER, Number2 : INTEGER) RETURNS INTEGER
  IF Number1 > Number2 THEN
    RETURN Number1
  ELSE
    RETURN Number2
  ENDIF
ENDFUNCTION
OUTPUT Max(5, 9)`,
    `def Max(Number1, Number2):
    if Number1 > Number2:
        return Number1
    else:
        return Number2

print(Max(5, 9))`,
  ],
];

export default pairs;
