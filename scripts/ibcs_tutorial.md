%%%%% G01
## 🎓 Welcome to IB Computer Science

Welcome to the **IB Diploma Programme Computer Science** course! 🚀 This course is not just about writing code — it is about learning how to **think computationally** and use that mindset to solve real-world problems.

In this course you will explore two big themes:

- 🧠 **Theme A — Concepts of Computer Science**: hardware, data representation, networks, databases and machine learning
- 💻 **Theme B — Computational Thinking & Problem-Solving**: computational thinking, programming, object-oriented programming and abstract data types

We will use **Python** as our chosen programming language throughout the course.

:::callout icon=💡
Computer Science is a *way of thinking*. Every topic connects back to one skill: taking a messy real-world problem and turning it into a clear, step-by-step solution.
:::

%%%%% C01
## 🌍 What is IB Computer Science?

IB Computer Science is an **experimental science** of the Diploma Programme — like Physics or Chemistry, but the "laboratory" is the computer and the experiments are programs you design, build and test.

The course is organised around **computational thinking** as its central core, spread across two themes:

- 🅰️ **Theme A — Concepts of Computer Science**: how computers *work* (A1 fundamentals), how they *connect* (A2 networks), how they *store* data (A3 databases) and how they *learn* (A4 machine learning)
- 🅱️ **Theme B — Computational Thinking & Problem-Solving**: how humans *solve* problems (B1), how solutions are *programmed* (B2), how they are *organised as objects* (B3) and advanced data types (B4)

### 🆚 SL vs HL

| | SL | HL |
| --- | --- | --- |
| Teaching hours | ~150 h | ~240 h |
| Extra content | — | Recursion, control systems, compilers, ADTs, advanced OOP, data preprocessing |
| Paper 3 (case study) | ❌ | ✅ |

%%Q1%%

%%Q2%%

### 🎯 What will you be able to do?

- ✅ Break real problems into steps a computer can execute
- ✅ Write, trace and debug programs in Python
- ✅ Explain how hardware, networks and databases work
- ✅ Design a complete software solution for a real client (the IA)

:::callout icon=💡
You do not need to be a programming genius to start. Curiosity, patience and logical thinking matter far more than experience!
:::

%%%%% C02
## 📝 How is the Course Assessed?

Knowing the assessment structure early helps you study *smart* — every topic you learn maps directly to marks. 🎯

### 🖊️ External Assessment (exams)

- 📄 **Paper 1 — Theory**: short-answer and structured questions on the whole syllabus (concepts of computer science + computational thinking)
- 💻 **Paper 2 — Programming**: read, trace, write and debug code in your chosen language (Python for us!) — including pseudocode and object-oriented programming
- 📚 **Paper 3 — Case Study (HL only)**: questions on the pre-released case study booklet the IB publishes each year

%%Q3%%

### 🧩 Internal Assessment (IA) — the Software Solution

You design and build a **working software product for a real client** — a teacher, a club, a school office — and document the whole process:

- 🔍 **Criterion A** — Initial planning
- 📋 **Criterion B** — Solution overview
- 🛠️ **Criterion C** — Development
- 🧪 **Criterion D** — Functionality (video of the product working)
- 🚀 **Criterion E** — Evaluation
- 📎 **Criterion F** — Appendix

The IA is worth **30% at SL** and **20% at HL** — more than any single exam paper!

%%Q4%%

:::callout icon=⚠️
The IA is a marathon, not a sprint. Students who start in the first term of Year 2 almost always produce better products — and better grades — than those who rush it.
:::

%%%%% G02
## 🧠 Theme B1 · Computational Thinking

Before we write a single line of Python, we learn the most important skill of the whole course: **thinking like a computer scientist**. 🧠

Computational thinking is a toolkit of mental strategies — decomposing problems, spotting patterns, abstracting away detail and designing algorithms — that applies to *any* problem, coded or not.

%%GQ2%%

%%%%% C03
## 🤔 What is Computational Thinking?

**Computational thinking (CT)** is a systematic approach to solving problems — designing solutions that can be carried out by a computer *or* a human. It does **not** require programming; it is a way of thinking first, and coding is just one way to express the result.

### 🧩 The Four Pillars

1. ✂️ **Decomposition** — break a big problem into smaller, manageable sub-problems
2. 🔍 **Pattern recognition** — find similarities with problems you have seen before
3. 🪶 **Abstraction** — remove irrelevant details, keep only what matters
4. 📐 **Algorithm design** — write the precise step-by-step solution

:::callout icon=💡
Example: planning a school festival 🎪. You decompose it (stage, food, tickets), recognise patterns (ticketing is the same as last year's sports day), abstract (a "vendor" is any food stall regardless of what it sells), and design an algorithm for queue management.
:::

%%Q5%%

### 🌈 Why does it matter?

CT is **transferable**. Doctors diagnosing patients, logistics companies routing trucks and you organising homework all use the same four strategies. In exams, CT questions ask you to apply these strategies to *unfamiliar* scenarios — not to recite definitions.

%%Q6%%

%%%%% C04
## ✂️ Problem Specification & Decomposition

### 📋 Step 1: Specify the problem

Before solving anything, state clearly:

- 📥 **Input** — what data do you have?
- ⚙️ **Process** — what must be done to it?
- 📤 **Output** — what must be produced?

Example — "Compute the average of test scores":

- Input: a list of scores
- Process: add them up, divide by how many
- Output: the average

A vague specification is the #1 cause of failed projects. If you cannot state input → process → output, you are not ready to code. ⚠️

%%Q7%%

### 🪓 Step 2: Decompose it

**Decomposition** (divide and conquer) splits a complex problem into independent sub-problems that are easier to understand, test and assign.

Example — "School canteen ordering app" decomposes into:

- 🧾 Menu display
- 🛒 Order taking
- 💳 Payment
- 📊 Daily sales report

Each piece can be solved (and debugged!) separately — then combined.

%%Q8%%

%%%%% C05
## 🔍 Pattern Recognition & Abstraction

### 🔁 Pattern recognition

**Pattern recognition** means spotting similarities between the current problem and problems you already know how to solve. If you have written a "highest score" program before, finding the "most popular canteen dish" follows the *same pattern*: keep a best-so-far variable and compare each new item.

Patterns appear at every scale — repeated code (→ loops 🔄), repeated logic (→ functions 🧰), repeated data shapes (→ data structures 📦).

%%Q9%%

### 🪶 Abstraction

**Abstraction** is building a simplified model that keeps only the **essential details** and ignores everything irrelevant to the task.

Designing a *school timetable algorithm*? Essential: teachers, rooms, time slots. Irrelevant: teachers' hair colour, room paint. 🎨❌

Everyday abstractions are everywhere:

- 🗺️ A metro map is an abstraction — geography is distorted so the *routes* are clear
- 🚗 A car dashboard abstracts thousands of parts into a speedometer and a fuel gauge

%%Q10%%

:::callout icon=⚠️
Abstraction is not "being vague". A good abstraction deliberately *chooses* which details matter for the task — and that choice can be defended and explained.
:::

%%%%% C06
## 📐 Algorithms, Pseudocode & Flowcharts

### 🧭 What is an algorithm?

An **algorithm** is a finite, unambiguous sequence of steps that solves a problem. Recipes 🍳 are algorithms; so are long-division and QR decoding.

### ✍️ Pseudocode

**Pseudocode** is a language-neutral way to write algorithms — precise enough to be unambiguous, informal enough to run nowhere. The IB has its own pseudocode conventions:

```text
input N
SUM = 0
loop I from 1 to N
    SUM = SUM + I
end loop
output SUM
```

Key IB conventions: `input` / `output` for I/O, `if ... else ... end if`, `loop X from A to B ... end loop`, `while ... end while`, and `←` or `=` for assignment.

### 🗺️ Flowcharts

**Flowcharts** visualise algorithms with standard symbols:

- 🥚 **Oval** — start / stop
- 📊 **Parallelogram** — input / output
- ▭ **Rectangle** — process
- 💎 **Diamond** — decision (yes/no branch)

%%Q11%%

%%Q12%%

%%Q13%%

%%%%% G03
## 🌱 Theme B2 · Programming Fundamentals

Time to write real code! 🐍 We use **Python**, one of the two languages the IB allows (the other is Java).

In this group you will learn the atoms of every program: **variables, data types, operators, input/output, errors** — and the exam superpower of **tracing code**.

%%GQ3%%

%%%%% C07
## 📦 Variables & Data Types

A **variable** is a named location in memory that stores a value — think of it as a labelled box 🏷️. The value can change while the program runs (that is why it is called *vari*able).

```python
score = 95
name = "Ada"
pi = 3.14
is_pass = True
```

### 🔤 Core data types

| Type | Meaning | Example |
| --- | --- | --- |
| `int` | whole numbers | `42`, `-7` |
| `float` | decimal numbers | `3.14`, `-0.5` |
| `str` | text (in quotes) | `"hello"` |
| `bool` | truth values | `True`, `False` |

### 🏷️ Naming rules

- ✅ Letters, digits, underscores: `student_age`, `total2`
- ❌ Cannot start with a digit: `2cool`
- ❌ Cannot be a reserved word: `class`, `if`, `for`
- ✅ Style: lowercase with underscores (`snake_case`)

%%Q14%%

%%Q15%%

:::callout icon=⚠️
`"3.14"` (with quotes) is a **string**, not a number — you cannot do maths with it until you convert it with `float()`.
:::

%%%%% C08
## ➗ Operators & Expressions

**Operators** combine values into **expressions** — the arithmetic of every program.

### 🔢 Arithmetic operators

| Operator | Meaning | Example | Result |
| --- | --- | --- | --- |
| `+ - *` | add, subtract, multiply | `7 * 3` | `21` |
| `/` | division (always float) | `7 / 2` | `3.5` |
| `//` | floor (integer) division | `7 // 2` | `3` |
| `%` | modulo (remainder) | `7 % 2` | `1` |
| `**` | power | `2 ** 3` | `8` |

💡 `//` and `%` are best friends: `17 // 5` gives the number of whole groups, `17 % 5` gives the leftovers. Use `% 2 == 0` to test even/odd.

%%Q16%%

### ⚖️ Comparison & logic

Comparisons produce **booleans**: `==` equal, `!=` not equal, `<`, `>`, `<=`, `>=`. Combine them with `and`, `or`, `not`.

```python
age = 16
print(age >= 16 and age < 18)   # True
```

%%Q17%%

:::callout icon=⚠️
`=` assigns a value; `==` compares two values. Mixing them up is the most common beginner bug!
:::

%%%%% C09
## ⌨️ Input & Output

### 📥 Input: `input()`

`input()` pauses the program, reads what the user types — and **always returns a string**, even if they type digits.

```python
age = input("Your age: ")        # typing 16 gives the STRING "16"
age = int(input("Your age: "))   # convert to a number for maths
```

%%Q18%%

### 📤 Output: `print()` and f-strings

```python
name = "Ada"
score = 95
print("Name:", name)                      # Name: Ada
print(f"{name} scored {score}")           # f-strings embed values directly
print(f"Average: {87.5:.1f}")             # Average: 87.5  (1 decimal place)
```

:::callout icon=💡
f-strings are the modern way to build output text. The `f` before the quote lets you put variables inside `{ }`.
:::

%%Q19%%

%%%%% C10
## 🚨 Errors & Exceptions

Three kinds of errors plague every programmer:

- 📝 **Syntax error** — the code breaks grammar rules; it will not even start (`print("hi"` — missing bracket)
- 💥 **Runtime error** — starts fine, crashes while running (`10 / 0`)
- 🤫 **Logic error** — runs without crashing but produces the *wrong answer* (`total / 2` instead of `total / count`) — the hardest to find!

%%Q20%%

### 🛡️ Handling exceptions with try/except

A crashing program is bad; a program that *expects* problems is professional:

```python
try:
    age = int(input("Your age: "))
    print("Next year you will be", age + 1)
except ValueError:
    print("Please type a whole number!")
```

%%Q21%%

:::callout icon=💡
In exams, "state the error type" questions are free marks: **syntax** = won't start, **runtime** = crash, **logic** = wrong output.
:::

%%%%% C11
## 🔍 Tracing Code

**Tracing** (a "dry run") means executing code slowly with a **trace table** — writing down every variable's value after each line. It is *the* most tested skill in Paper 2.

```python
total = 0
n = 5
while n > 0:
    total = total + n
    n = n - 1
print(total)
```

| Step | n | total |
| --- | --- | --- |
| start | 5 | 0 |
| 1 | 4 | 5 |
| 2 | 3 | 9 |
| 3 | 2 | 11 |
| 4 | 1 | 12 |
| 5 | 0 | 15 → loop ends |

Output: `15` — the sum 5+4+3+2+1. ✅

:::callout icon=💡
Exam tip: never trace "in your head". Draw the table. Columns for every variable, one row per loop iteration. Sloppy traces = wrong answers.
:::

%%Q22%%

%%Q23%%

%%%%% G04
## 🔀 Theme B2.3 · Programming Constructs

Every program ever written is built from just **three control structures**:

- ➡️ **Sequence** — one line after another
- 🔀 **Selection** — choose a path (`if / elif / else`)
- 🔄 **Iteration** — repeat (`for` and `while`)

Master these plus **functions**, and you can express any algorithm. 🚀

%%GQ4%%

%%%%% C12
## 🔀 Selection: if, elif, else

Selection lets a program **choose** between paths based on a condition:

```python
score = int(input("Score: "))
if score >= 90:
    print("Grade 7 ⭐")
elif score >= 75:
    print("Grade 5–6")
elif score >= 50:
    print("Grade 3–4")
else:
    print("Try again 💪")
```

Python checks conditions **top to bottom** and runs only the **first** true branch — everything else is skipped, even if also true.

:::callout icon=⚠️
Indentation *is* the syntax in Python. Everything belonging to `if` must be indented by the same amount (4 spaces by convention).
:::

%%Q24%%

%%Q25%%

%%%%% C13
## 🔄 Iteration: for Loops & range()

A **for loop** repeats a block a **known** number of times — or once per item of a collection:

```python
for i in range(5):          # 0, 1, 2, 3, 4
    print(i)

for i in range(2, 11, 2):   # start 2, stop before 11, step 2
    print(i)                # 2, 4, 6, 8, 10

for name in ["Ada", "Alan", "Grace"]:
    print(f"Hello {name}")
```

### 🎯 range(start, stop, step)

- `range(5)` → 0 1 2 3 4 (stop is **never included**)
- `range(1, 6)` → 1 2 3 4 5
- `range(10, 0, -1)` → countdown 10 … 1

%%Q26%%

%%Q27%%

:::callout icon=💡
Use a **for** loop when you know how many repetitions; use a **while** loop when you don't (e.g. "until the user types quit").
:::

%%%%% C14
## 🔁 Iteration: while Loops

A **while loop** repeats as long as its condition stays `True` — perfect when the number of repetitions is *unknown in advance*:

```python
password = input("Password: ")
while password != "open123":
    print("Wrong! Try again 🔒")
    password = input("Password: ")
print("Access granted ✅")
```

### ⚠️ The infinite loop

If the condition never becomes `False`, the loop never ends:

```python
n = 10
while n > 0:
    print(n)      # bug: n never changes → runs forever!
```

### 🚪 break & continue

- `break` — exit the loop immediately
- `continue` — skip to the next iteration

%%Q28%%

%%Q29%%

%%%%% C15
## 🧰 Functions & Modularity

A **function** is a named, reusable block of code — the practical result of *decomposition* and *modularity*:

```python
def calculate_average(scores):
    total = sum(scores)
    return total / len(scores)

avg = calculate_average([80, 90, 100])
print(f"Average: {avg}")
```

### 🧩 Key vocabulary

- 📥 **Parameter** — the input named in the definition (`scores`)
- 📤 **Return value** — the result sent back with `return`
- 🏷️ **Scope** — variables created inside a function are *local* and invisible outside

:::callout icon=💡
`return` sends a value back to the caller; `print` just displays it. `return` lets you *reuse* the result: `x = calculate_average(...) * 2` works, `print(...)` does not.
:::

Why modularise? ✅ Write once, use many times · ✅ Easier to test in isolation · ✅ Teams can split work · ✅ Bugs stay contained

%%Q30%%

%%Q31%%

%%%%% G05
## 📚 Theme B2.2 · Data Structures

A program's algorithm is only half the story — **how you organise the data** decides how easily you can process it. 🗄️

This group covers the IB data structure zoo: arrays & lists, 2D arrays, and the classic stacks & queues.

%%GQ5%%

%%%%% C16
## 🧱 Static vs Dynamic Structures

Data structures split into two families:

- 🧱 **Static** — size fixed at creation; cannot grow or shrink. Example: arrays in Java.
- 🌊 **Dynamic** — grows and shrinks as the program runs. Example: Python lists.

```python
# Python lists are dynamic:
scores = [80, 90]
scores.append(75)      # now length 3 — no size declaration needed
```

### ⚖️ Trade-offs

| | Static (array) | Dynamic (list) |
| --- | --- | --- |
| Memory | fixed, possibly wasted or too small | grows on demand |
| Speed | very fast fixed indexing | tiny overhead for resizing |
| Flexibility | must know max size in advance | add/remove freely |

%%Q32%%

%%Q33%%

%%%%% C17
## 📋 Lists & Arrays (1D)

A **one-dimensional array/list** stores a sequence of elements in order, each reachable by its **index**. Indexes start at **0**! 🚨

```python
scores = [80, 92, 75, 61]
print(scores[0])       # 80  (first element)
print(scores[-1])      # 61  (last element)
print(len(scores))     # 4

scores.append(88)      # add to the end
scores[2] = 78         # replace index 2
```

### 🔁 Processing every element

The universal pattern — accumulate with a loop:

```python
total = 0
for s in scores:
    total = total + s
print(total / len(scores))
```

:::callout icon=⚠️
The last valid index of a list of length *n* is `n - 1`. Accessing `scores[len(scores)]` throws an **index out of range** runtime error — a classic exam trap!
:::

%%Q34%%

%%Q35%%

%%%%% C18
## 🗺️ 2D Arrays (Grids)

A **two-dimensional array** is a list of lists — perfect for grids, tables and game boards:

```python
grid = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
]
print(grid[1][2])   # row 1, column 2 → 6
```

`grid[row][column]` — row first, then column. 🧭

### 🔁 Nested loops to visit every cell

```python
for r in range(len(grid)):          # each row
    for c in range(len(grid[r])):   # each column in that row
        print(grid[r][c], end=" ")
    print()                         # new line after each row
```

%%Q36%%

%%Q37%%

%%%%% C19
## 🥞 Stacks & Queues

Two classic structures defined by *how* you may access them:

### 🥞 Stack — LIFO (Last In, First Out)

Like a stack of plates: you only touch the top. Operations: **push** (add to top), **pop** (remove from top).

Applications: undo 🔙, browser back button, function call stack, expression evaluation.

```python
stack = []
stack.append("a")   # push
stack.append("b")
top = stack.pop()   # pop → "b"
```

### 🚶 Queue — FIFO (First In, First Out)

Like a checkout line: first arrival is served first. Operations: **enqueue** (add to back), **dequeue** (remove from front).

Applications: printer queues 🖨️, task scheduling, message buffers, BFS search.

%%Q38%%

%%Q39%%

%%%%% G06
## ⚙️ Theme B2.4 / B2.5 · Algorithms & Files

Algorithms are where programming gets *interesting*: how fast is your solution? 📈

We learn to measure efficiency with **Big O**, then study the exam classics — **searching, sorting, recursion** — and finish with reading and writing **files**.

%%GQ6%%

%%%%% C20
## 📈 Algorithm Efficiency & Big O

**Big O notation** describes how an algorithm's cost grows as input size *n* grows — ignoring constants and small terms:

| Big O | Name | Example |
| --- | --- | --- |
| O(1) | constant | `list[5]` — one step regardless of size |
| O(log n) | logarithmic | binary search |
| O(n) | linear | linear search, one pass through a list |
| O(n²) | quadratic | nested loops, bubble sort |

```python
# O(n): touches each element once
total = 0
for x in data:
    total += x

# O(n²): for each element, we scan again (nested loop)
for i in range(n):
    for j in range(n):
        print(i, j)
```

:::callout icon=💡
Doubling *n*: an O(n) algorithm takes twice as long; an O(n²) algorithm takes **four** times as long. That is why efficiency matters for big data.
:::

%%Q40%%

%%Q41%%

%%%%% C21
## 🔎 Linear & Binary Search

### 🚶 Linear search — O(n)

Check every element from the start until you find the target (or reach the end). Works on **any** list, sorted or not.

```python
def linear_search(items, target):
    for i in range(len(items)):
        if items[i] == target:
            return i
    return -1
```

### 🏃 Binary search — O(log n)

Repeatedly cut a **sorted** list in half:

1. Compare the middle element with the target
2. If equal → found ✅
3. If target is smaller → search the left half; larger → search the right half
4. Repeat until found or the range is empty

```text
loop while FIRST <= LAST
    MID = (FIRST + LAST) div 2
    if DATA[MID] = TARGET then
        output MID
    else if DATA[MID] < TARGET then
        FIRST = MID + 1
    else
        LAST = MID - 1
    end if
end loop
```

⚠️ Binary search only works on **sorted** data — but 1,000,000 sorted items take at most ~20 comparisons!

%%Q42%%

%%Q43%%

%%%%% C22
## 🫧 Bubble & Selection Sort

### 🫧 Bubble sort

Repeatedly walk through the list, compare **neighbours**, swap if out of order. After each pass, the largest remaining value "bubbles" to the end.

```text
[5, 3, 8, 1] → [3, 5, 8, 1] → [3, 5, 8, 1] → [3, 5, 1, 8]   pass 1
```

- Complexity: **O(n²)** — simple but slow
- ✅ Advantage: detects an already-sorted list quickly

### 🎯 Selection sort

Each pass: **select** the smallest remaining element and swap it into position.

```text
[5, 3, 8, 1] → [1, 3, 8, 5] → [1, 3, 5, 8]
```

- Complexity: **O(n²)** always — but only at most *n − 1* swaps

%%Q44%%

%%Q45%%

%%%%% C23
## 🔁 Recursion (HL)

A **recursive** function solves a problem by calling **itself** on a smaller version of the same problem.

Every recursive function needs exactly two things:

- 🛑 **Base case** — the smallest problem, solved directly (stops the recursion)
- 🔁 **Recursive case** — call itself with a *smaller* input, moving toward the base case

```python
def factorial(n):
    if n == 0:          # base case
        return 1
    return n * factorial(n - 1)   # recursive case
```

`factorial(4)` = 4 × factorial(3) = 4 × 3 × factorial(2) = … = 4 × 3 × 2 × 1 = **24**. Each pending call waits on the **call stack**.

:::callout icon=⚠️
No base case (or never reaching it) → **infinite recursion** → stack overflow crash! 💥
:::

%%Q46%%

%%Q47%%

%%%%% C24
## 📂 File Processing (B2.5)

Real programs read and write data that outlives the program — stored in **files**. The IB focuses on **sequential text files**.

### 📖 Reading a file

```python
with open("students.txt", "r") as f:
    for line in f:                 # line by line (newline included)
        print(line.strip())

with open("students.txt", "r") as f:
    lines = f.readlines()          # list of all lines
```

### ✍️ Writing a file

```python
with open("results.txt", "w") as f:    # "w" overwrites, "a" appends
    f.write("Ada,95\n")
    f.write("Alan,88\n")
```

### 🗝️ File modes

| Mode | Meaning | If file exists | If not |
| --- | --- | --- | --- |
| `"r"` | read | reads from start | error ❌ |
| `"w"` | write | **erases** contents! | creates it |
| `"a"` | append | adds to end | creates it |

%%Q48%%

%%Q49%%

%%%%% G07
## 🏛️ Theme B3 · Object-Oriented Programming

Procedural code organises *steps*; object-oriented programming (OOP) organises *things*. 🧱

OOP models the world as **objects** — data and the operations on it bundled together. It is also the design toolkit for your IA product!

%%GQ7%%

%%%%% C25
## 🏗️ Classes & Objects

A **class** is a *blueprint* 📐; an **object** (instance) is one *thing* built from it. One `Student` class → thousands of student objects.

```python
class Student:
    def __init__(self, name, score):    # constructor
        self.name = name                # attributes (data)
        self.score = score

    def introduce(self):                # method (behaviour)
        print(f"I am {self.name}, scored {self.score}")

s1 = Student("Ada", 95)     # create an object
s1.introduce()              # I am Ada, scored 95
```

### 🧩 Anatomy

- 🏗️ `__init__` — the **constructor**, runs when an object is created
- 📦 **Attributes** — variables belonging to the object (`s1.name`)
- ⚙️ **Methods** — functions belonging to the object (`s1.introduce()`)
- 🪞 `self` — refers to "this object" inside the class; the first parameter of every method

%%Q50%%

%%Q51%%

%%%%% C26
## 🔒 Encapsulation & Methods

**Encapsulation** = bundling data + methods together, and **protecting** the data from uncontrolled changes.

```python
class BankAccount:
    def __init__(self, owner, balance):
        self.owner = owner
        self.__balance = balance        # double underscore = "private"

    def deposit(self, amount):
        if amount > 0:
            self.__balance += amount

    def get_balance(self):
        return self.__balance
```

Now the balance can only change **through the methods** — no one can write `account.__balance = -999999`. 💰🚫

### ✅ Why encapsulate?

- 🛡️ Invalid states are blocked (validation inside methods)
- 🔧 Internal details can change without breaking outside code
- 📖 The object documents *what you can do* with it

%%Q52%%

%%Q53%%

%%%%% C27
## 🧬 Inheritance & Polymorphism (HL)

### 🧬 Inheritance

A **subclass** inherits the attributes and methods of a **superclass**, then adds or overrides behaviour:

```python
class Animal:
    def __init__(self, name):
        self.name = name
    def speak(self):
        print("Some sound")

class Dog(Animal):                  # Dog IS-A Animal
    def speak(self):                # override
        print(f"{self.name} says Woof! 🐶")

d = Dog("Rex")
d.speak()        # Rex says Woof!
```

💡 Use `super().__init__(...)` to run the parent's constructor and avoid duplicating code.

### 🎭 Polymorphism

The same method call behaves **differently** depending on the object's actual class: `for a in [Dog("Rex"), Cat("Mia")]: a.speak()` — one loop, two behaviours.

:::callout icon=💡
Inheritance models "**is-a**" (Dog is an Animal). If the relationship is "**has-a**" (Car has an Engine), use composition instead.
:::

%%Q54%%

%%Q55%%

%%%%% C28
## 🧩 Multiple Classes & Design (HL)

Real products are built from **many collaborating classes**. The two fundamental relationships:

### 🔗 Composition ("has-a", strong)

The part **cannot exist** without the whole — a `House` *has* `Room`s; destroy the house, the rooms go too.

### 🫧 Aggregation ("has-a", weak)

The parts exist **independently** — a `Course` *has* `Student`s; the students survive course deletion.

```python
class Engine:
    def start(self): print("Vroom 🏎️")

class Car:
    def __init__(self):
        self.engine = Engine()      # composition
    def start(self):
        self.engine.start()
```

### 🎨 Why design patterns?

**Design patterns** are reusable solutions to recurring design problems — shared vocabulary that lets developers say "use a Factory here" instead of re-explaining the idea.

%%Q56%%

%%Q57%%

%%%%% G08
## 🌲 Theme B4 · Abstract Data Types (HL only)

HL students go deeper: implementing the data structures that power real systems — **linked lists** and **binary search trees**. 🌲

Here we do not just *use* structures — we explain how they work from the inside, and why we would choose them.

%%GQ8%%

%%%%% C29
## 🔗 Linked Lists

%%GQ8%%

A **linked list** stores elements in **nodes**, each holding data plus a **pointer/reference** to the next node. The entry point is the **head**.

```text
head → [A | •]→[B | •]→[C | ∅]
```

### ⚖️ Linked list vs array

| Operation | Array | Linked list |
| --- | --- | --- |
| Access i-th element | O(1) direct index | O(n) must walk from head |
| Insert/delete at front | O(n) shift everything | O(1) rewire pointers ✅ |
| Memory | contiguous block | scattered nodes + pointer overhead |

A **doubly linked list** adds a backward pointer per node — traversal in both directions, at the cost of extra memory.

%%Q58%%

%%Q59%%

%%%%% C30
## 🌲 Binary Search Trees

A **binary search tree (BST)** is a tree where every node has at most two children, and the nodes obey one rule:

> 🔑 **Left subtree < node < right subtree** (by key value)

```text
        8
       / \
      3   10
     / \    \
    1   6    14
```

### ⚙️ Key operations

- 🔍 **Search / insert** — compare and go left or right: O(log n) if the tree is *balanced*
- 📥 **In-order traversal** (left, node, right) — visits values in **sorted order**! ✨

:::callout icon=⚠️
Insert 1, 2, 3, 4, 5 in order into a plain BST and you get a straight line — a "degenerate" tree with O(n) search. Balanced variants (AVL trees) fix this.
:::

%%Q60%%

%%Q61%%

%%%%% G09
## 🖥️ Theme A1 · Computer Fundamentals

Under every elegant program hums a machine. 🖥️

Theme A explains the physical reality: how the **CPU** executes your code, how data becomes **binary**, and how **logic gates** make decisions from electricity.

%%GQ9%%

%%%%% C31
## ⚙️ CPU & the Fetch–Decode–Execute Cycle

The **CPU** is the machine's brain, with three key parts:

- 🎛️ **Control Unit (CU)** — directs the traffic, decodes instructions
- 🔢 **ALU (Arithmetic Logic Unit)** — does the maths and comparisons
- 📦 **Registers** — tiny, ultra-fast memory inside the CPU (e.g. the **Program Counter** holds the address of the next instruction)

### 🔄 The Fetch–Decode–Execute (FDE) cycle

1. 📥 **Fetch** — CU fetches the instruction at the address in the Program Counter
2. 🧠 **Decode** — CU works out what the instruction means
3. ⚡ **Execute** — ALU or other hardware carries it out
4. 🔁 Repeat — millions or billions of times per second (measured in GHz)

### 🎮 CPU vs GPU

- **CPU** — few powerful cores, great at *sequential*, varied tasks (the boss 👔)
- **GPU** — thousands of small cores, great at *parallel* repetition: graphics, machine learning training (the army 🪖)

HL students also study **pipelining** in multicore architectures — overlapping the FDE stages of successive instructions so several are "in the pipeline" at once, like an assembly line. 🏭

%%Q62%%

%%Q63%%

%%%%% C32
## 💾 Secondary Memory, Compression & the Cloud

### 💽 Secondary memory

Secondary storage keeps data **when power is off**:

- 📀 **HDD** — spinning magnetic platters; cheap, large, slower, moving parts
- ⚡ **SSD** — flash memory chips; faster, silent, no moving parts, pricier per GB

### 🗜️ Data compression

- 📦 **Lossless** — original perfectly restorable: ZIP, PNG, FLAC. Essential for text and program files.
- 🖼️ **Lossy** — throws away detail humans barely notice, much smaller: JPEG, MP3, MP4. Fine for media, unacceptable for documents.

### ☁️ Cloud computing

Computing and storage delivered **over the internet** instead of on your machine: 📈 scales on demand, 🤝 easy collaboration, 🌍 accessible anywhere — but needs connectivity and raises data-privacy questions.

%%Q64%%

%%Q65%%

%%%%% C33
## 🔢 Binary & Hexadecimal

Computers store *everything* — numbers, text, images, sound — as **binary**: patterns of 0s and 1s (off/on electrical states). ⚡

### 🔁 Binary → denary

Each place value is a power of 2:

```text
1 0 1 1
8 4 2 1   →  8 + 0 + 2 + 1 = 11
```

### 🔁 Denary → binary

Repeatedly divide by 2 and collect remainders bottom-up:

```text
13 ÷ 2 = 6 r 1
 6 ÷ 2 = 3 r 0
 3 ÷ 2 = 1 r 1
 1 ÷ 2 = 0 r 1   →  1101
```

### 🔣 Hexadecimal (base 16)

Digits 0–9 then A=10 … F=15. **One hex digit = exactly 4 bits**, so hex is a compact shorthand for binary: `FF` = `1111 1111` = 255. Colours like `#FF5733` and memory addresses use hex everywhere.

:::callout icon=💡
8 bits = 1 **byte** → values 0–255. ASCII "A" is `01000001` = 65. Text, sound and images are all just binary interpreted with the right rules.
:::

%%Q66%%

%%Q67%%

%%Q68%%

%%%%% C34
## 🚦 Logic Gates & Truth Tables

Inside the CPU, decisions are made by **logic gates** — circuits computing boolean operations on bits:

| Gate | Operation | Output is 1 when… |
| --- | --- | --- |
| AND | A ∧ B | **both** inputs are 1 |
| OR | A ∨ B | **at least one** input is 1 |
| NOT | ¬A | input is 0 (inverts) |
| XOR | A ⊕ B | inputs are **different** |

### 📊 Truth table for AND

| A | B | A AND B |
| --- | --- | --- |
| 0 | 0 | 0 |
| 0 | 1 | 0 |
| 1 | 0 | 0 |
| 1 | 1 | 1 |

Gates combine into **circuits** that compute expressions like `(A AND B) OR NOT C` — and millions of them together form a CPU. 🤯

%%Q69%%

%%Q70%%

%%Q71%%

%%%%% G10
## 🕹️ Theme A1.3 / A1.4 · Operating & Control Systems

Between your programs and the raw hardware sits a referee: the **operating system**. 🕹️

And in the world of physical devices — robots, thermostats, aircraft — computers form **control systems**. (Mostly HL territory!)

%%GQ10%%

%%%%% C35
## 🖥️ Operating Systems

The **OS** (Windows, macOS, Linux, Android…) hides hardware complexity and manages resources:

- 🧑‍💼 manages processes, memory, files and devices
- 🖱️ provides the user interface
- 🛡️ mediates access and keeps programs from trampling each other

### ⏱️ Scheduling

With more tasks than CPU cores, the **scheduler** decides who runs next:

- 🚶 **First-Come-First-Served** — simple queue; one long job delays everyone
- 🔁 **Round robin** — each process gets a fixed **time slice**, then back of the queue; fair and responsive
- 🚑 **Priority** — important tasks jump the queue; risks starving low-priority tasks

### ⚡ Interrupts & multitasking

An **interrupt** is a hardware signal that pauses the CPU — "keyboard pressed!", "timer ticked!" — letting the OS respond immediately. Interrupts (plus fast scheduling) are what make **multitasking** feel simultaneous: the CPU switches between processes thousands of times per second.

HL: contrast interrupt-driven handling with **polling**, where the CPU repeatedly checks devices — simpler but wastes cycles.

%%Q72%%

%%Q73%%

%%%%% C36
## 🤖 Control Systems (HL)

A **control system** uses a computer to automatically manage a physical process: heating, autopilots, robots, traffic lights. 🤖

### 🧩 Components

- 🌡️ **Sensors** — measure the physical world (temperature, light, pressure) → input
- 🧠 **Microprocessor/computer** — compares readings with the target value
- ⚙️ **Actuators** — carry out commands in the physical world (motors, valves, heaters) → output

### 🔁 The feedback loop

1. 🌡️ Sensor reads the current value
2. 🧠 Computer compares it with the **set point** (target)
3. ⚙️ If they differ, actuator adjusts the process
4. 🔁 Repeat continuously

Air-conditioning at 22 °C: sensor reads 24 → cooler switches on → 22 reached → off → room warms → on again… an endless feedback loop. 🌡️❄️

%%Q74%%

%%Q75%%

%%%%% C37
## 🌐 Compilers & Interpreters (HL)

CPUs only understand **machine code** — so high-level code must be **translated**. Two strategies:

### 🏭 Compiler

Translates the **whole program at once** into machine code, producing an executable file. Runs very fast afterward; errors are reported after compiling the entire program (C, C++). A syntax error means *nothing* executes until it is fixed.

### 🎤 Interpreter

Translates and runs **line by line**, every time it runs. Easier to test and debug (errors stop at the offending line); much slower on re-runs (Python, JavaScript).

### ⚖️ Compare & contrast

| | Compiler | Interpreter |
| --- | --- | --- |
| Translation | whole program, once | line by line, every run |
| Speed of execution | fast ✅ | slower |
| Error reporting | after full compile | stops at first bad line |
| Output | standalone executable | needs the interpreter present |

**Bytecode** (Java, Python) is a hybrid: compile to an intermediate form, then run it on a virtual machine — portable across platforms. 📦

%%Q76%%

%%Q77%%

%%%%% G11
## 🌐 Theme A2 · Networks

No computer is an island. 🌐 Networks turned isolated machines into the internet — this theme covers how data travels, how networks are built, and how they are defended.

%%GQ11%%

%%%%% C38
## 🏘️ Network Fundamentals

### 🏘️ Network types

- 🏠 **LAN** (Local Area Network) — one site: home, school, office. Fast, privately owned.
- 🌍 **WAN** (Wide Area Network) — spans cities/countries by linking LANs; the internet is the ultimate WAN.
- 📶 **WLAN** — a LAN using wireless (Wi-Fi) access points.
- 🔒 **VPN** (Virtual Private Network) — an encrypted "tunnel" through the public internet, making a remote device behave as if it were inside a private network.

### 🏢 Intranet, extranet & cloud

- 🏫 **Intranet** — a private internal network for an organisation's members
- 🤝 **Extranet** — the intranet opened *partially* to trusted outsiders (suppliers, partners)
- ☁️ **Cloud** — computing/storage rented over the internet instead of owned on-site

%%Q78%%

%%Q79%%

%%%%% C40
## 🗺️ Network Architecture

### 🕸️ Topologies — the shape of a network

- ⭐ **Star** — every device connects to a central switch/hub. Easy to add devices; one cable failure affects one device — but the centre is a single point of failure. *(The most common LAN topology.)*
- 🚌 **Bus** — all devices share one backbone cable; cheap but a backbone break kills the network.
- 🕸️ **Mesh** — every device links to many others; extremely fault-tolerant (the internet's spirit), expensive in cabling.

### 🏪 Client–server vs peer-to-peer

- 🏪 **Client–server** — central servers provide services (files, web, email); clients request. Easy to secure and back up centrally; the server is a single point of failure and cost.
- 🤝 **Peer-to-peer (P2P)** — every machine is both client and server; no central authority (file sharing, some blockchains). Cheap and resilient, but hard to secure and manage.

HL: know the **roles of servers** — web, mail, file, print, DNS, DHCP — each dedicating hardware/software to one service at scale.

%%Q80%%

%%Q81%%

%%%%% C41
## ✉️ Data Transmission

### 📦 Packets & packet switching

Data is chopped into **packets**, each carrying sender/receiver **IP addresses** and a sequence number. **Packet switching** lets each packet travel its own route through the network; the receiver reassembles them in order. If one route fails, packets simply flow another way — the internet's superpower. 🌊

### 🏠 IP addressing

An **IP address** uniquely identifies a device on a network. **IPv4** offers ~4.3 billion addresses (32-bit, e.g. `192.168.1.1`) — exhausted! **IPv6** (128-bit, e.g. `2001:db8::1`) provides a practically unlimited space.

### 🧵 Transmission media & modes

- 🧵 Twisted-pair copper — cheap, common in LANs
- 💡 **Fibre optic** — light through glass: fastest, longest distance, no electrical interference
- 📡 Wireless — convenient, slower, more exposed to interception

Modes: **simplex** (one-way), **half-duplex** (both ways, one at a time — walkie-talkie), **full-duplex** (both at once — phone call).

%%Q82%%

%%Q83%%

%%%%% C42
## 🛡️ Network Security

### 🧱 Defences

- 🧱 **Firewall** — filters traffic entering/leaving a network by rules
- 🔐 **Encryption** — scrambles data so only key-holders can read it: **symmetric** (one shared key, fast) vs **asymmetric** (public + private key pair — the basis of HTTPS/TLS 🔒)
- 🪪 Authentication — passwords, 2FA, biometrics
- 🩹 Updates & backups — patch vulnerabilities, survive ransomware

### ☠️ Common threats

- 🦠 **Malware** — viruses, worms, ransomware (encrypts your files for payment)
- 🎣 **Phishing** — fake emails/sites harvesting credentials
- 👤 Social engineering — manipulating *people*, the weakest link
- 🚪 Open ports & unpatched software — the technical weak spots

:::callout icon=💡
Security is layered ("defence in depth"): a firewall cannot stop an employee who willingly types their password into a phishing site.
:::

%%Q84%%

%%Q85%%

%%%%% G12
## 🗄️ Theme A3 · Databases

Where do a school's grades, a hospital's records and a shop's inventory live? In **databases**. 🗄️

This theme: how relational databases work, how to design them properly, and how to talk to them with **SQL**.

%%GQ12%%

%%%%% C43
## 🗃️ Database Fundamentals

A **database** is an organised collection of data. A **relational database** stores it in **tables** (relations) — the dominant model for decades.

### 🧩 Vocabulary

- 📋 **Table** — one entity type, e.g. `Students`
- 📏 **Record (row)** — one instance, one student
- 🏷️ **Field (column)** — one attribute, e.g. `email`
- 🔑 **Primary key** — field(s) that **uniquely identify** each record (student ID, not name!)
- 🔗 **Foreign key** — a field in one table that references the primary key of another — creating the *relationship*

```text
STUDENTS                     ENROLMENTS
+----+------+-------+        +-------------+-----------+
| id | name | class |        | student_id  | course_id |
+----+------+-------+        +-------------+-----------+
| 1  | Ada  | 12A   | ←──────| 1           | 9         |
+----+------+-------+        +-------------+-----------+
 primary key                  foreign key
```

### ✅ Why databases (not spreadsheets)?

Minimal **redundancy** (no duplicate copies of data), enforced **integrity** (invalid data rejected), concurrent access by many users, and powerful querying.

%%Q86%%

%%Q87%%

%%%%% C44
## 📐 Database Design: ERDs & Normalization

### 🗺️ Entity-Relationship Diagrams

Design starts with an **ERD**:

- ⬛ **Entity** — a thing we store (rectangle): `Student`, `Course`
- 🔗 **Relationship** — how entities connect, with **cardinality**: one-to-one (1:1), one-to-many (1:M), many-to-many (M:N)
- M:N relationships are implemented with a **junction table** (like `Enrolments` above) whose two foreign keys form a composite primary key

### 🧹 Normalization — cleaning up the design

A process that restructures tables to eliminate redundancy and anomalies:

- **1NF** — every field holds a single, atomic value (no "phone1, phone2" lists in one cell)
- **2NF** — 1NF + no field depends on *part* of a composite key
- **3NF** — 2NF + no field depends on another *non-key* field (don't store the class teacher's *name* in the class table — look it up!)

:::callout icon=💡
Goal: "the data lives in exactly one place." Update it once and it is correct everywhere.
:::

%%Q88%%

%%Q89%%

%%%%% C45
## 💬 SQL: Querying & Manipulating Data

**SQL** (Structured Query Language) is the standard language of relational databases.

### 🔍 Querying — SELECT

```sql
SELECT name, score
FROM students
WHERE score >= 75
ORDER BY score DESC;
```

### ✏️ Modifying data

```sql
INSERT INTO students (id, name, class) VALUES (5, 'Grace', '12B');
UPDATE students SET score = 90 WHERE id = 5;
DELETE FROM students WHERE id = 5;
```

### 🔗 JOIN — combining tables

```sql
SELECT students.name, courses.title
FROM enrolments
JOIN students ON enrolments.student_id = students.id
JOIN courses  ON enrolments.course_id  = courses.id;
```

### 📊 Aggregates (HL extension practice)

`COUNT`, `SUM`, `AVG`, `MAX`, `MIN` + `GROUP BY` summarise thousands of rows in one query:

```sql
SELECT class, AVG(score) FROM students GROUP BY class;
```

%%Q90%%

%%Q91%%

%%%%% C46
## 🏭 Alternative Databases & Warehouses (HL)

Relational databases are not the only kind:

### 🍃 NoSQL databases

- 📄 **Document stores** (MongoDB) — JSON-like documents; flexible schema
- 🔑 **Key-value stores** (Redis) — blazing-fast lookups; caching, sessions
- 🕸️ **Graph databases** — nodes + edges; social networks, recommendation engines

**When to choose NoSQL?** Massive scale, rapidly changing structure, or relationship-heavy data where rigid tables and SQL JOINs don't fit.

### 🏭 Data warehouses & OLAP

A **data warehouse** copies data from many operational systems into one huge, analysis-optimised store. **OLAP** (Online Analytical Processing) then slices it multidimensionally: sales by year × region × product — feeding business intelligence dashboards. 📊

Contrast: operational databases = **fast, current transactions** (OLTP); warehouse = **historical, analytical queries** (OLAP).

%%Q92%%

%%Q93%%

%%%%% G13
## 🤖 Theme A4 · Machine Learning

Not every problem has an algorithm you can write down. How do you *describe* a cat? 🐱

**Machine learning** flips programming: instead of coding the rules, we let the computer *learn* patterns from data.

%%GQ13%%

%%%%% C47
## 🧠 Machine Learning Fundamentals

%%GQ13%%

**Machine learning (ML)** builds systems that improve at a task **from experience (data)** rather than explicit programming.

### 🎓 Learning approaches

- 🏷️ **Supervised learning** — train on **labelled** data (input + correct answer). Classification (spam / not spam 📧) and regression (predicting house prices 🏠).
- 🧩 **Unsupervised learning** — no labels; find hidden structure. Clustering customers into groups, anomaly detection.
- 🎮 **Reinforcement learning (HL)** — an agent learns by trial, error and reward (game AIs, robotics).

### ⚙️ The workflow

Collect data → **preprocess** (clean, select features — HL) → **train** the model → **test** on unseen data → deploy → monitor.

:::callout icon=⚠️
Golden rule: evaluate on data the model has **never seen**. A student who memorises past papers is not the same as one who understands — and neither is a model.
:::

%%Q94%%

%%Q95%%

%%%%% C48
## ⚖️ Ethics & Impact of Machine Learning

ML decides who gets a loan, whose résumé is shortlisted and what news you see — so its failures are *human* failures. 💥

### 🧭 Key ethical issues

- ⚖️ **Algorithmic bias** — models learn from historical data; biased data in, biased decisions out (a hiring model trained on a male-dominated past may downrank women)
- 🔒 **Privacy** — models trained on scraped personal data; face recognition surveillance
- 🕳️ **Opacity** — deep networks are "black boxes"; can we explain a rejected loan?
- 🪞 **Accountability** — a self-driving car crashes: who is responsible? Developer? Owner? Manufacturer?
- 🌍 **Environmental & social impact** — training giant models consumes enormous energy; automation reshapes jobs

### ✅ Responsible ML

Diverse training data, transparency/explainability, human oversight for high-stakes decisions, and compliance with privacy law (GDPR-style regulations).

:::callout icon=💡
In exams, ethics questions are *argument* questions: state the issue, explain both sides, and ground it in a concrete example.
:::

%%Q96%%

%%Q97%%

%%%%% G14
## 🧩 IA, Case Study & Exam Skills

The final stretch: the two components where *you* drive — the **Internal Assessment** product and the **case study** — plus how to revise effectively. 🧩

%%GQ14%%

%%%%% C49
## 🧩 The Internal Assessment: Software Solution

%%GQ14%%

You act as a **developer for a real client** — a teacher, coach, shop owner — and deliver a working product plus full documentation (30% of SL, 20% of HL).

### 🗺️ The six criteria

| Criterion | What it asks |
| --- | --- |
| 🔍 **A — Initial planning** | Client, problem, success criteria, consultation |
| 📋 **B — Solution overview** | Record of tasks, design overview, test plan |
| 🛠️ **C — Development** | Techniques used, iterative development, evidence |
| 🎬 **D — Functionality** | A video of the *actual product* working |
| 🚀 **E — Evaluation** | Against success criteria, client feedback, extensions |
| 📎 **F — Appendix** | Full code listings |

### ✅ Habits of top-scoring IAs

- 🤝 Consult the client *throughout*, and document each consultation
- 🧪 Test iteratively — show versions, bugs and fixes in Criterion C, not just a final product
- 🎯 Define *specific, measurable* success criteria in A ("loads under 2 s", not "looks good")
- ⏰ Start early — Criterion C alone is the largest single chunk of marks in the course

%%Q98%%

%%Q99%%

%%%%% C50
## 📚 The Case Study & Exam Strategy

### 📚 The case study

Each year the IB **pre-releases a case study booklet** — a real-world computing scenario (recent years: emerging technologies, large-scale systems). Questions in the external exams assess your understanding of its concepts, vocabulary and implications.

How to prepare:

- 📖 Read it at least three times — annotate, don't just read
- 🔍 Build a glossary of every technical term it introduces
- ❓ Write and answer your own questions for each section
- 🌍 Connect its technology to Theme A syllabus content you already know

### 🎯 Exam strategy (Paper 1 & 2)

- ✍️ Learn the **IB pseudocode** conventions — Paper 2 questions use them
- 🔍 Practise **trace tables** until they are reflex
- 🛠️ For "construct an algorithm" questions: plan with input→process→output *first*, then code
- ⏱️ Command terms matter: *state* = one line, *explain* = give reasons, *justify* = support with evidence

:::callout icon=🎯
You have now completed the full course tour! Revisit weak topics, grind past-paper style questions, and start your IA early. Good luck! 🍀
:::

%%Q100%%

%%Q101%%
