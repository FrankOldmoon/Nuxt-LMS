/**
 * ALEVEL (9618) 官方风格示例 —— 分模块导出，可整体或单个 import。
 * 用法：
 *   import { examples as alevel } from "./examples/alevel.mjs";
 *   import { aFunction } from "./examples/alevel.mjs";
 */

export const aHello = `OUTPUT "Hello, World"`;

export const aAssignment = `DECLARE Name : STRING
DECLARE Age : INTEGER
DECLARE Height : REAL
DECLARE Weight : REAL
DECLARE Gender : CHAR
DECLARE IsOverweight : BOOLEAN
CONSTANT Pi = 3.14
//Test the comments
Name = "Jack"
Age = 18
Height = 1.75
Weight = 65.5
Gender = 'M'
IsOverweight = FALSE
INPUT Name
INPUT Age
INPUT Height
INPUT Weight
INPUT Gender
INPUT IsOverweight
OUTPUT Name
OUTPUT Age
OUTPUT Height
OUTPUT Weight
OUTPUT Gender
OUTPUT IsOverweight`;

export const aIf = `DECLARE Age : INTEGER
INPUT Age
IF Age >= 18 THEN
    OUTPUT "Adult"
ELSE
    IF Age >= 0 THEN
        OUTPUT "Child"
    ELSE
        OUTPUT "Error"
    ENDIF
ENDIF`;

export const aCase = `DECLARE Score : INTEGER
DECLARE Grade : STRING
INPUT Score
CASE OF Score
    90 TO 100 : Grade = "A*"
    80 TO 90 : Grade = "A"
    70 TO 80 : Grade = "B"
    60 TO 70 : Grade = "C"
    OTHERWISE : Grade = "F"
ENDCASE
OUTPUT "Grade is", Grade`;

export const aFor = `DECLARE Index : INTEGER
FOR Index <- 1 TO 10
    OUTPUT Index * Index
NEXT Index`;

export const aWhile = `DECLARE Index : INTEGER
Index = 1
WHILE Index <= 10
    OUTPUT Index * Index
    Index = Index + 1
ENDWHILE`;

export const aRepeat = `DECLARE Index : INTEGER
Index = 1
REPEAT
    OUTPUT Index * Index
    Index = Index + 1
UNTIL Index > 10`;

export const aProcedure = `PROCEDURE Greeting(Name : STRING)
    OUTPUT "Hello", Name
ENDPROCEDURE

CALL Greeting("Oldmoon")`;

export const aFunction = `FUNCTION Abs(Number : INTEGER) RETURN INTEGER
    IF Number < 0 THEN
        Number = -Number
    ENDIF
    RETURN Number
ENDFUNCTION

DECLARE Num : INTEGER
INPUT Num
OUTPUT Abs(Num)`;

export const aStringFunc = `OUTPUT RIGHT("hello",3)
OUTPUT LEFT("hello",3)
OUTPUT MID("hello",3,2)
OUTPUT UCASE("h")
OUTPUT LCASE("H")`;

export const aNumericFunc = `OUTPUT INT(1.9)
OUTPUT RAND(100)`;

/** 聚合对象：便于整体遍历测试 */
export const examples = {
  aHello,
  aAssignment,
  aIf,
  aCase,
  aFor,
  aWhile,
  aRepeat,
  aProcedure,
  aFunction,
  aStringFunc,
  aNumericFunc,
};

export default examples;
