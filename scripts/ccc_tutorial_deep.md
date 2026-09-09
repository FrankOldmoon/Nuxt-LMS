%%%%% C_ABOUT
## 🍁 About the CCC

**CCC** (Canadian Computing Competition) is organized by the University of Waterloo every February. It is one of the most influential programming contests for secondary school students, and the gateway to the Canadian Computing Olympiad (CCO) 🚪

The contest lasts **3 hours**. There are two papers — Junior and Senior — each with 5 problems. You choose one paper when you register:

| Paper | Who it's for | Problems | Difficulty in our bank (1–8) |
| --- | --- | --- | --- |
| 🥉 Junior | ~1 year of coding experience | J1 – J5 | 1 – 6 |
| 🥇 Senior | CCO / advanced training | S1 – S5 | 4 – 8 |

:::callout icon=💡
⭐ **Subtask (partial) scoring**: every problem is graded per test batch! Even if you can't find the full algorithm, submitting a brute-force solution that handles small cases still earns real points. **Never leave a problem unsubmitted.**
:::

%%Q1%%

%%Q2%%

## 🧭 Training Roadmap

Work through the course in four stages — each stage builds on the previous one:

- 🥉 **Stage 1 · Tools**: Input/Output, Conditionals and Loops, Strings, Lists and Sorting — every chapter ends with the real problems that drill exactly those skills
- 🥈 **Stage 2 · Problem types**: enumeration & simulation, grids, search, recursion — with worked examples and full problem sets
- 🥇 **Stage 3 · Senior push**: the S1–S5 route, greedy techniques, and all 70 Senior problems
- 🏆 **Stage 4 · Full mock**: solve a complete year's paper in 3 hours with a timer (see the 14-day plan at the end)
%%%%% C_IO
## 📥 The Three Input Patterns

Every CCC statement tells you the exact input format. Almost every input you will ever see follows one of three patterns:

| Pattern | Code | Typical use |
| --- | --- | --- |
| One integer per line | `n = int(input())` | counts, sizes, scores |
| Several values on one line | `a, b = map(int, input().split())` | coordinates, pairs, limits |
| One item per line, N lines | `for _ in range(n): row = input()` | grids, message logs |

```python
# all three together — the shape of a whole contest
n = int(input())                    # how many items follow
best = 0
for _ in range(n):
    x, y = map(int, input().split())
    best = max(best, x + y)
print(best)
```

## 🖨️ Output Control

- `print(x)` — newline added automatically
- `print(a, b)` — values separated by a **space** (change it with `sep=","`)
- `print(f"{name}: {score}")` — f-strings build any output format
- `print(*list)` — print a list with spaces: `print(*[1, 2, 3])` → `1 2 3`

## ⚠️ The Classic Traps

- `input()` returns a **string**: `"3" + 1` crashes → `int(input())`
- `int("3.5")` crashes → use `float("3.5")` or `int(float(s))`
- `"3 5"` is **one line** containing **two tokens** — `split()` handles it
- Reversed output order or missing spaces are the #1 cause of WA on an otherwise-correct solution

:::callout icon=💡
Before coding, **underline the input format in the statement** and write the reading code first. Half of all J1 mistakes happen before any real logic runs.
:::

## 📦 Worked Example: CCC24J1 Conveyor Belt Sushi

Three lines, one integer each; multiply and add — pure input/output plumbing:

```python
r = int(input())
g = int(input())
b = int(input())
print(3 * r + 4 * g + 5 * b)
```

%%Q3%%

%%Q4%%

### 📝 OJ Practice

%%PROBLEM_LIST%%
%%%%% C_CL
## 🔀 Making Decisions

```python
if over <= 0:
    print("ok")
elif over <= 30:
    print(100)
else:
    print(500)
```

- `elif` chains run **top to bottom** — the first true branch wins, the rest are skipped
- Boolean operators: `and`, `or`, `not`; Python chains comparisons naturally: `1 <= x <= 10`
- ❌ `=` assigns, `==` compares — `if x = 5:` is a syntax error
- Deep nesting is a smell: `if a and b:` usually beats `if a: if b:`

## 🔁 for Loops: range in Depth

```python
range(5)          # 0 1 2 3 4           — count 5 things
range(1, 6)       # 1 2 3 4 5           — from 1 to 5 inclusive
range(10, 0, -1)  # 10 9 8 ... 1        — countdown
range(0, 10, 2)   # 0 2 4 6 8           — step by 2
```

You can also loop **directly over** strings, lists and files — `for ch in word:` beats index juggling.

## ♾️ while Loops: Stop-Condition Thinking

Use `while` when you **don't know how many repetitions** — you only know when to stop:

```python
a, b = int(input()), int(input())
count = 2
while a - b >= 0:      # keep going while the next term exists
    a, b = b, a - b
    count += 1
print(count)
```

⚠️ Every `while` loop needs something inside that moves it toward stopping — otherwise it runs forever. `break` exits immediately; `continue` skips to the next round.

## 🧮 Accumulator Patterns (memorize these!)

Almost every Junior problem is one of these three shapes:

```python
count = 0                  # 1. counting how many
total = 0                  # 2. summing up
best = None                # 3. finding the best
for x in items:
    if condition: count += 1
    total += x
    if best is None or x > best: best = x
```

## 🎲 Nested Loops

A loop inside a loop runs `n × m` times — the doorway to grids and enumeration:

```python
for i in range(1, 4):
    for j in range(1, 4):
        print(i, j)        # (1,1) (1,2) (1,3) (2,1) ...
```

## 📦 Worked Example: CCC20J2 Epidemiology

Simulate the spread day by day until the total passes P — a `while` loop with two state variables:

```python
r = int(input())
d = int(input())
p = int(input())
total, infected, day = 1, 1, 0
while total <= p and day < d:   # stop when target reached or days used up
    infected *= r
    total += infected
    day += 1
print(day)                      # day count when total first exceeded p
```

%%Q5%%

%%Q6%%

### 📝 OJ Practice

%%PROBLEM_LIST%%
%%%%% C_STR
## 🔤 Indexing and Slicing

```python
s = "programming"
s[0]        # 'p'      — first character
s[-1]       # 'g'      — last character
s[3:7]      # 'gram'   — slice from index 3 up to (not including) 7
s[::-1]     # reversed — the palindrome weapon
len(s)      # 11
```

Strings are **immutable**: you never change a character in place — you build a new string.

## 🧰 The Essential Methods

| Method | Does | Example |
| --- | --- | --- |
| `s.upper()` / `s.lower()` | case | `"AbC".lower()` → `"abc"` |
| `s.count(t)` | count occurrences | `"abcabc".count("b")` → 2 |
| `s.split(sep)` | split into list | `"1,2,3".split(",")` → `["1","2","3"]` |
| `sep.join(list)` | glue a list | `"-".join(["a","b"])` → `"a-b"` |
| `s.find(t)` | first index (−1 if absent) | `"abc".find("c")` → 2 |
| `s.replace(a, b)` | replace all | `"aaa".replace("a","b")` → `"bbb"` |
| `s.strip()` | trim whitespace | `" hi ".strip()` → `"hi"` |
| `s.startswith(t)` | prefix test | `"ccc".startswith("c")` → True |

## 🔢 Characters and Codes

Letters are ordered, so characters compare directly: `"a" < "b"`, `"B" < "a"` (uppercase comes first!). To shift letters with wraparound:

```python
def shift(c, k):
    base = ord('A') if c.isupper() else ord('a')
    return chr((ord(c) - base + k) % 26 + base)

shift('Y', 2)   # 'A' — Z wraps around to A
```

## 🔁 Run-Length Pattern

"Count consecutive identical things" appears everywhere (Cold Compress, message logs):

```python
from itertools import groupby
for ch, grp in groupby("aaabbc"):
    print(len(list(grp)), ch)     # 3 a | 2 b | 1 c
```

## 📦 Worked Example: CCC19J2 Time to Decompress

Read "count + character" pairs and expand them:

```python
L = int(input())
for _ in range(L):
    n, c = input().split()
    print(c * int(n))
```

## 📦 Worked Example: CCC15J3 Rövarspråket

Consonants become consonant + "o" + consonant; everything else passes through:

```python
s = input()
out = ""
for c in s:
    if c.isalpha() and c.lower() not in "aeiou":
        out += c + "o" + c
    else:
        out += c
print(out)
```

:::callout icon=💡
Building a string with `out += x` in a loop is fine at CCC sizes. For huge inputs, collect parts in a list and `"".join(parts)` at the end — it's the professional habit.
:::

%%Q7%%

%%Q10%%

### 📝 OJ Practice

%%PROBLEM_LIST%%
%%%%% C_LIST
## 📚 List Essentials

```python
nums = [5, 3, 9, 3]
nums.append(7)      # add at the end
len(nums)           # 5
nums.count(3)       # 2
sum(nums)           # 27    — also min(), max(), sorted()
3 in nums           # True
nums[1:3]           # slice — [3, 9]
```

## 🔄 Sorting Like a Pro

```python
nums.sort()                          # in place, ascending
nums.sort(reverse=True)              # descending
sorted(nums)                         # new list, original untouched

# sort by anything with key=
words.sort(key=len)                  # shortest first
rows.sort(key=lambda row: row[0])    # by first column
people.sort(key=lambda p: (-p[1], p[0]))  # by score desc, then name
```

:::callout icon=💡
`key=` is the single most useful sorting tool in the Senior paper — "sort by X, then greedily take from the front" is half of all S1–S2 solutions.
:::

## 🧮 Counting with Dictionaries

The standard way to count things — works on strings, numbers, anything:

```python
counts = {}
for x in items:
    counts[x] = counts.get(x, 0) + 1

# or the one-liner
from collections import Counter
counts = Counter(items)
```

## 🗂️ Reading a Table (2D Lists)

```python
n = int(input())
rows = [list(map(int, input().split())) for _ in range(n)]
# rows[i][j] — row i, column j
```

## 📦 Worked Example: CCC18J4 Sunflowers

N sunflowers stand shortest-to-tallest, but the rows got shuffled. Column 0 holds day-1 heights — sort by it and output the last column:

```python
n = int(input())
rows = [list(map(int, input().split())) for _ in range(n)]
rows.sort(key=lambda row: row[0])
print(*[row[-1] for row in rows])
```

## 📦 Worked Example: CCC24J3 Bronze Count

Sort the scores, take the third-highest **distinct** value, count how many got it:

```python
n = int(input())
scores = sorted({int(input()) for _ in range(n)}, reverse=True)
print(scores[2], scores.count(scores[2]))
```

%%Q8%%

%%Q13%%

### 📝 OJ Practice

%%PROBLEM_LIST%%
%%%%% C_ENUM
## 🔁 Brute Force: When "Small" Means "Solve It"

Enumeration means trying every candidate exactly as the problem describes. It feels "dumb" — it is also **the correct answer** whenever the search space is small:

- a year counter up to 10 000 → try every year
- a clock with 12 × 60 = 720 minutes → try every minute
- a list of ≤ 100 chores → try every order? too many (100!) — but *sorting* them is enough

💡 Rough budget: Python handles about **10⁶–10⁷ simple operations per second**. Before coding, estimate how many iterations your loop needs. If it's ≤ ~10⁷, brute force and never look back.

## 🎯 The Enumeration Template

```python
best = None
for candidate in all_candidates:
    if ok(candidate):
        best = candidate        # first match / best match / count them
```

Three typical shapes: **find the first** (From 1987 to 2013), **count all** (Favourite Times), **find the best** (Time on task).

## 🕐 Timeline Simulation: Replay the Events

When the input is a sequence of events in time order, **replay them** while keeping state in variables and dictionaries:

```python
n = int(input())
t = 0                  # current time
start = {}             # friend -> time their message arrived
total = {}             # friend -> accumulated wait
for _ in range(n):
    op, val = input().split()
    if op == "W":
        t += int(val)              # fast-forward
    else:
        t += 1                     # a normal event takes 1 second
        f = int(val)
        if op == "R":
            start[f] = t           # arm the stopwatch
        else:                      # "S": settle the wait
            total[f] = total.get(f, 0) + t - start[f]
for f in sorted(total):
    print(f, total[f])
```

## 📦 Worked Example: CCC13J3 From 1987 to 2013

```python
y = int(input()) + 1
while len(set(str(y))) < len(str(y)):   # repeated digits found
    y += 1
print(y)
```

💡 `set(str(y))` shorter than the string itself → a digit repeated. Watch the 999 → 1023 trap: compare **lengths**, don't hard-code 4.

## 📦 Worked Example: CCC22J4 Good Groups

Constraints like "A and B together" / "A and C apart" — map students to group numbers with a dict, then check every constraint:

```python
group = {}
for name, g in ...:
    group[name] = g          # student -> group number

bad = 0
for a, b in together:
    if group[a] != group[b]: bad += 1
for a, b in apart:
    if group[a] == group[b]: bad += 1
print(bad)
```

%%Q11%%

%%Q12%%

### 📝 OJ Practice

%%PROBLEM_LIST%%
%%%%% C_GRID
## 🗺️ Reading Grids: Two Flavors

```python
# flavor 1: rows of characters (mazes, maps)
r = int(input())
grid = [input() for _ in range(r)]
# grid[i][j] — row i, column j

# flavor 2: rows of integers (tables, heights)
n = int(input())
table = [list(map(int, input().split())) for _ in range(n)]
```

## 🧭 Neighbors and Bounds

The four-direction vocabulary used by nearly every grid problem:

```python
dr = [-1, 1, 0, 0]        # up, down, none, none
dc = [0, 0, -1, 1]        # left, right moves

def inside(r, c):
    return 0 <= r < R and 0 <= c < C

for k in range(4):
    nr, nc = r + dr[k], c + dc[k]
    if inside(nr, nc) and ok(nr, nc):
        visit(nr, nc)
```

## 🎨 Row/Column Tricks

Many grid problems don't need every cell — only **per-row and per-column facts** (counts, sums, parity). Work rows and columns as separate lists first; often the whole problem collapses.

## 📦 Worked Example: CCC21J5 Modern Art

An M×N canvas starts black; each operation repaints an entire row or column (gold ↔ black). A cell ends **gold** exactly when (row repaints + column repaints) touching it is **odd** — no need to track the canvas at all:

```python
row_flip = [False] * M
col_flip = [False] * N
# each operation: row_flip[r] ^= True   or   col_flip[c] ^= True

odd_rows = sum(row_flip); even_rows = M - odd_rows
odd_cols = sum(col_flip); even_cols = N - odd_cols
print(odd_rows * even_cols + even_rows * odd_cols)
```

💡 This "count odd/even rows and columns" trick turns a 100×100 simulation into four numbers.

%%Q19%%

### 📝 OJ Practice

%%PROBLEM_LIST%%
%%%%% C_SEARCH
## 🔍 Which Search Do I Need?

| Situation | Tool |
| --- | --- |
| fewest steps / shortest path | **BFS** |
| collect everything reachable (region) | **Flood Fill** (DFS or BFS) |
| try all sequences of choices | **Backtracking** (next chapter) |

## ⚔️ BFS: The Minimum-Step Machine

BFS explores **layer by layer** — everything 1 step away, then 2 steps, ... So the **first time you reach a cell is with the fewest possible steps**. That single fact is why BFS answers "minimum moves" questions.

```python
from collections import deque

moves = [(1, 2), (2, 1), (2, -1), (1, -2), (-1, -2), (-2, -1), (-2, 1), (-1, 2)]
step = {(sr, sc): 0}               # start: 0 steps
q = deque([(sr, sc)])
while q:
    r, c = q.popleft()
    for dr, dc in moves:
        nr, nc = r + dr, c + dc
        if 1 <= nr <= 8 and 1 <= nc <= 8 and (nr, nc) not in step:
            step[(nr, nc)] = step[(r, c)] + 1
            q.append((nr, nc))
print(step[(gr, gc)])
```

Anatomy (memorize this shape): **queue + visited/step map + neighbor loop + bounds check**.

## 🌾 Flood Fill: Collecting a Region

CCC24J5 Harvest Waterloo — from the start cell, walk up/down/left/right through everything reachable and sum the values (`S`=1, `M`=5, `L`=10):

```python
import sys
sys.setrecursionlimit(100000)     # deep grids need more recursion room

def dfs(r, c):
    if r < 0 or r >= R or c < 0 or c >= C: return 0
    if grid[r][c] == '*' or seen[r][c]:    return 0
    seen[r][c] = True
    total = value[grid[r][c]]
    for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        total += dfs(r + dr, c + dc)
    return total
```

:::callout icon=💡
BFS vs DFS for flood fill: both give the same region. DFS is shorter to write; BFS never hits Python's recursion limit. On big grids, prefer BFS.
:::

## 📦 Worked Example: CCC20J5 Escape Room

Rooms are cells with jump distances; BFS from (0,0), the first arrival at the exit decides the answer — same template, different "moves".

%%Q14%%

%%Q15%%

%%Q16%%

### 📝 OJ Practice

%%PROBLEM_LIST%%
%%%%% C_REC
## ♻️ The Two Laws of Recursion

1. **Base case** — a situation you can answer without recursing (missing it = infinite recursion = crash)
2. **Shrink** — every recursive call must move toward the base case

```python
def f(n):                # factorial
    if n <= 1:           # ✅ base case
        return 1
    return n * f(n - 1)  # smaller problem
```

## 🌳 Think in Recursion Trees

Before coding, draw the tree: "Unfriend" asks how many ways employees can party — each manager either attends (subtree splits) or not (subtree merges). Draw 3 levels by hand and the recurrence writes itself: `ways(x) = product / sum of children's values` depending on the branch.

## 🔙 Backtracking Template

When you must **try all combinations** (coin games, rule rewrites, pie distributions), use choose → explore → un-choose:

```python
def solve(state):
    if done(state):
        return 1                    # found one way
    total = 0
    for choice in options(state):
        apply(choice)               # choose
        total += solve(next_state)  # explore
        undo(choice)                # un-choose — restore the state!
    return total
```

## ⚡ When It's Too Slow: Memoization

If the same state appears many times, cache it:

```python
from functools import lru_cache

@lru_cache(maxsize=None)
def ways(a, b, c):
    ...
```

💡 This one decorator turns exponential blowups into linear scans — and it's exactly the bridge from J5 recursion to Senior S4 dynamic programming.

%%Q17%%

### 📝 OJ Practice

%%PROBLEM_LIST%%
%%%%% C_SENIOR
## 🗺️ The S1–S5 Route

| Problem | Core topic | Training focus |
| --- | --- | --- |
| S1 | simulation / sorting | translate the statement into code, carefully |
| S2 | enumeration / greedy | learn to sort first, then pair up |
| S3 | simulation + data structures | use dict / set / deque flexibly |
| S4 | DP / introductory graphs | state design and transitions |
| S5 | combined (graphs / data structures) | advanced algorithms + complexity |

:::callout icon=💡
S1–S2 reuse everything you learned in the Junior chapters — the difficulty is **precision and edge cases**, not new algorithms. A student who is solid on J1–J4 should start S1 immediately.
:::

## ⚖️ Greedy in Action: CCC16J5 Tandem Bicycle

Two countries each field N riders on tandem bikes; a bike's speed = the faster rider; minimize (d=0) or maximize (d=1) the total speed:

```python
n = int(input())
d = int(input())
dmoj = sorted(int(input()) for _ in range(n))
peg = sorted((int(input()) for _ in range(n)), reverse=(d == 1))
print(sum(max(a, b) for a, b in zip(dmoj, peg)))
```

💡 **Greedy idea**: to minimize → fastest pairs with fastest (both ascending); to maximize → fastest pairs with slowest (one ascending, one descending). "Sort first, then pair" is the most common greedy shape in the whole Senior paper.

%%Q18%%

## 🧭 Level-by-Level Playbook

- **S1**: careful simulation; the statement is long but the code is short — underline the output format
- **S2**: sort + greedy, or enumerate a small space; prove to yourself why the greedy choice is safe
- **S3**: choose the right structure — `dict` for counts, `set` for membership, `deque` for queues and sliding windows
- **S4**: DP starts here — define the **state** (what do I need to know?), then the **transition** (how do states connect?)
- **S5**: graphs and heavier data structures; always check complexity before coding

### 📝 OJ Practice

%%PROBLEM_LIST%%
%%%%% C_PLAN
## 📚 17 Years of Real Problems (2010–2026)

%%INDEX_TABLE%%

:::callout icon=🎯
We recommend solving **from the newest years backwards**: 2024–2026 statements are the friendliest (J1 takes only 3 lines of input), perfect for warming up; older years' J4/J5 tend to be harder — save them until after you've studied each problem type. Click any problem ID in the table to jump straight to its OJ page.
:::

## ✅ 14-Day Training Plan

:::tasklist
- [ ] Days 1–2: 📥 Input/Output + 🔀🔁 Conditionals and Loops — clear the J1/J2 sets
- [ ] Days 3–4: 🔤 Strings + 📚 Lists and Sorting — clear both sets
- [ ] Days 5–6: 🔁 Enumeration and Simulation — clear the set, revisit Wait Time
- [ ] Days 7–8: 🗺️ 2D Grids — clear the set, redo Sunflowers from scratch
- [ ] Days 9–10: 🔍 Search — clear the set, write BFS template from memory
- [ ] Day 11: ♻️ Recursion and Backtracking — clear the set
- [ ] Days 12–13: 🥇 Senior Route — S1–S2 problems
- [ ] Day 14: 🏆 full mock of a complete Junior paper, then review every WA
:::
