/**
 * Python 反向转换示例（Python → 伪代码）—— 分模块导出。
 * 用法：
 *   import { pythonExamples } from "./examples/python.mjs";
 *   import { basics } from "./examples/python.mjs";
 */

export const basics = `Age = None
Age = 18
print(Name, Age)
if Age >= 18:
    print("Adult")
else:
    print("Child")
Index = None
Index = 1
while Index <= 10:
    print(Index * Index)
    Index = Index + 1
Index = None
for Index in range(1, 11):
    print(Index * Index)`;

export const stringfuncs = `Name = None
Name = "Hello"
print(len(Name))
print(Name.lower())
print(Name.upper())
Value = None
Value = int(1.9)
print(Value)`;

export const proc = `def Greeting(Name):
    print("Hello", Name)

Greeting("Oldmoon")`;

export const func = `def Max(Number1, Number2):
    if Number1 > Number2:
        return Number1
    else:
        return Number2

A = None
A = Max(5, 9)
print(A)`;

export const byref = `def SWAP(X, Y):
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
print(A, B)`;

/** 聚合对象：便于整体遍历测试 */
export const pythonExamples = {
  basics,
  stringfuncs,
  proc,
  func,
  byref,
};

export default pythonExamples;
