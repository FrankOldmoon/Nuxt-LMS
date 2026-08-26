/**
 * IGCSE (0478) 官方风格示例 —— 分模块导出，可整体或单个 import。
 * 用法：
 *   import { examples as igcse } from "./examples/igcse.mjs";
 *   import { hello, if_ } from "./examples/igcse.mjs";
 */

export const hello = `OUTPUT "Hello, World"`;

export const assignment = `DECLARE Name:STRING
DECLARE Age:INTEGER
DECLARE Height:REAL
DECLARE Weight:REAL
DECLARE Gender:CHAR
DECLARE IsOverweight:BOOLEAN
CONSTANT Pi <- 3.14
//Test the comments
Name <- "Jack"
Age <- 18
Height <- 1.75
Weight <- 65.5
Gender <- 'M'
IsOverweight <- FALSE
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

export const if_ = `DECLARE Age:INTEGER
INPUT Age
IF Age >= 18 THEN
	OUTPUT "Adult"
ELSE
	IF Age >=0 THEN
		OUTPUT "Child"
	ELSE
		OUTPUT "Error"
	ENDIF
ENDIF`;

export const case_ = `DECLARE Score:INTEGER
DECLARE Grade:STRING
INPUT Score
CASE OF Score
	90 TO 100 : Grade <- "A*"
	80 TO 90 : Grade <- "A"
	70 TO 80 : Grade <- "B"
	60 TO 70 : Grade <- "C"
	OTHERWISE : Grade <- "F"
ENDCASE
OUTPUT "Grade is", Grade`;

export const for_ = `DECLARE Index:INTEGER
FOR Index <- 1 TO 10
	OUTPUT Index*Index
NEXT Index`;

export const array_ = `DECLARE Scores:ARRAY[1:3] OF INTEGER
DECLARE ClassScores:ARRAY[1:3,1:4] OF INTEGER
DECLARE Index1:INTEGER
DECLARE Index2:INTEGER
FOR Index1 <- 1 TO 3
	INPUT Scores[Index1]
NEXT Index1
FOR Index1 <- 1 TO 3
	FOR Index2 <- 1 TO 4
		ClassScores[Index1,Index2] <- 0
	NEXT Index2
NEXT Index1`;

export const while_ = `DECLARE Index:INTEGER
Index <- 1
WHILE Index <= 10 DO
	OUTPUT Index*Index
	Index <- Index + 1
ENDWHILE`;

export const repeat_ = `DECLARE Index:INTEGER
Index <- 1
REPEAT
	OUTPUT Index*Index
	Index <- Index + 1
UNTIL Index > 10`;

export const procedure_ = `PROCEDURE Greeting(Name : STRING)
	OUTPUT "Hello", Name
ENDPROCEDURE

CALL Greeting("Oldmoon")`;

export const function_ = `FUNCTION Abs(Number : INTEGER) RETURN INTEGER
	IF Number < 0 THEN
		Number <- -Number
  ENDIF
	RETURN Number
ENDFUNCTION

DECLARE Num:INTEGER
INPUT Num
OUTPUT Abs(Num)`;

export const file_ = `OPENFILE "a.txt" FOR READ
OPENFILE "b.txt" FOR WRITE
DECLARE Line:STRING
WHILE NOT EOF("a.txt") DO
	READFILE "a.txt", Line
	WRITEFILE "b.txt", Line
ENDWHILE
CLOSEFILE "a.txt"
CLOSEFILE "b.txt"`;

export const stringFunc_ = `OUTPUT RIGHT("hello",3)
OUTPUT LEFT("hello",3)
OUTPUT MID("hello",3,2)
OUTPUT UCASE("h")
OUTPUT LCASE("H")`;

export const numericFunc_ = `OUTPUT INT(1.9)
OUTPUT RAND(100)`;

/** 聚合对象：便于整体遍历测试 */
export const examples = {
  hello,
  assignment,
  if_,
  case_,
  for_,
  array_,
  while_,
  repeat_,
  procedure_,
  function_,
  file_,
  stringFunc_,
  numericFunc_,
};

export default examples;
