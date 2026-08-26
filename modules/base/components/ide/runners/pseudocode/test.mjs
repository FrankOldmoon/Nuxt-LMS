import { psToPy, pyToPs, roundtrip } from "./index.mjs";

const ig = `DECLARE Age:INTEGER
INPUT Age
IF Age >= 18 THEN
  OUTPUT "Adult"
ELSE
  OUTPUT "Child"
ENDIF`;

const al = `DECLARE Age : INTEGER
INPUT Age
IF Age >= 18 THEN
    OUTPUT "Adult"
ELSE
    OUTPUT "Child"
ENDIF`;

console.log("===== psToPy IGCSE =====");
console.log(psToPy(ig));
console.log("\n===== psToPy ALEVEL =====");
console.log(psToPy(al, "ALEVEL"));

console.log("\n===== pyToPs IGCSE =====");
console.log(pyToPs(`Age = None
Age = input()
if Age >= 18:
    print("Adult")
else:
    print("Child")`));

console.log("\n===== roundtrip IGCSE =====");
console.log(roundtrip(`OUTPUT "Hello, World"`));
