%%%%% G1
Welcome to the **CCC Preparation Course** 🍁

This course is built directly on our **problem bank of 155 real CCC problems (2010–2026)** hosted on the school OJ. Every concept is taught with a worked example from a real problem, and every section ends with practice — including embedded OJ problems you can submit and AC.

**What's inside:**

- 🍁 About the CCC — contest format and the subtask scoring system
- 🧭 Training Roadmap — a four-stage plan from syntax to full mocks
- 🐍 Python Syntax Toolbox — the exact syntax the Junior paper needs
- 🎯 Seven Junior problem types — calculation, strings, enumeration, timeline simulation, grids, search, recursion
- 🥇 Senior Sprint — the S1–S5 route with greedy techniques
- 📅 17 years of indexed real problems + a 14-day training plan

%%GQ1%%
%%%%% C11
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
%%%%% C12
Work through the course in four stages — each stage builds on the previous one:

- 🥉 **Stage 1 · Syntax**: master the Python Syntax Toolbox, then solve J1–J2 from 2024–2026
- 🥈 **Stage 2 · Problem types**: break through the 7 Junior problem types one by one — read each lesson, then solve the matching real problems
- 🥇 **Stage 3 · Senior push**: S1–S2 greedy + sorting, S3 simulation + data structures, S4–S5 DP and graphs
- 🏆 **Stage 4 · Full mock**: solve a complete year's paper in 3 hours with a timer, training reading speed and partial-credit strategy

:::callout icon=🎯
💡 A realistic pace: the 14-day plan at the end of this course covers one stage every few days. Short daily sessions beat one long weekly cram.
:::
%%%%% G2
All **155 problems in our bank can be solved with basic Python syntax + a few algorithmic ideas** 🐍

This part covers the five syntax pillars that the Junior paper actually tests:

- 📥 Input and Output
- 🔀 Conditionals
- 🔁 Loops
- 🔤 Strings
- 📚 Lists and Sorting

The first 3 Junior problems need almost nothing but these — master this part and J1–J3 are free points 🎁

%%GQ2%%
%%%%% C21

```python
n = int(input())                  # read one integer
a, b = input().split()            # read two words separated by spaces
x, y = map(int, input().split())  # read two integers (most common)
print(x + y)                      # print the result
```

:::callout icon=⚠️
`input()` always returns a **string**! You must call `int()` before doing any math with it.
:::

%%Q3%%

%%Q4%%
%%%%% C22
Take **CCC12J1 Speed fines are not fine!** as an example: given the speed limit and your speed, print a different result based on how much you exceeded it — a classic multi-branch if–elif–else:

```python
limit, speed = map(int, input().split())
over = speed - limit
if over <= 0:
    print("Congratulations, you are within the speed limit!")
elif over <= 30:
    print(100)
else:
    print(500)
```

%%Q5%%
%%%%% C23

- `for i in range(n)` — when you know how many times to repeat
- `while condition` — when you only know when to stop

📦 **Worked example: CCC11J3 Sumac Sequences** — each term is the difference of the previous two, until one term is smaller than the one before it. That's exactly a `while` shape:

```python
a, b = int(input()), int(input())
count = 2
while a - b >= 0:      # the next term still exists
    a, b = b, a - b
    count += 1
print(count)
```

%%Q6%%
%%%%% C24
String problems in the CCC only need these tricks:

| Expression | Meaning | Example |
| --- | --- | --- |
| `len(s)` | length | `len("abc")` → 3 |
| `s[i]` / `s[-1]` | indexing | `"abc"[0]` → `"a"` |
| `s * 3` | repetition | `"ab" * 3` → `"ababab"` |
| `s[::-1]` | reversed | the palindrome weapon |
| `s.split(",")` | splitting | `"1,2".split(",")` → `["1", "2"]` |
| `s.count("x")` | counting | `"abcabc".count("b")` → 2 |

%%Q7%%
%%%%% C25

```python
nums = [5, 3, 9]
nums.sort()              # ascending
nums.sort(reverse=True)  # descending
print(sum(nums), max(nums), min(nums), len(nums))
```

:::callout icon=💡
`sort()` modifies the list in place (returns nothing); `sorted(nums)` returns a new list and keeps the original. Either is fine in a contest — just pick one and stick with it.
:::

%%Q8%%
%%%%% G3
The Junior paper follows predictable patterns. In this part we break it into **7 problem types** 🎯

For each type you get: the core idea, a worked example from a real problem, similar problems from the bank, a quick-check question, and an embedded **OJ Practice** problem to submit on the school judge.

- 🎯 Type 1 · Direct Calculation (J1–J2)
- 🔤 Type 2 · String Processing
- 🔁 Type 3 · Enumeration and Simulation
- 🕐 Type 4 · Timeline Simulation
- 🗺️ Type 5 · 2D Grids
- 🔍 Type 6 · Search (BFS / DFS)
- ♻️ Type 7 · Recursion and Backtracking

%%GQ3%%
%%%%% C31
The J1–J2 formula: **read carefully → compute what the problem asks → print it**. The difficulty is in careful reading, not coding 📖

### 📦 Worked example: CCC24J1 Conveyor Belt Sushi

Red plates cost $3, green $4, blue $5. Read the counts and print the total:

```python
r = int(input())
g = int(input())
b = int(input())
print(3 * r + 4 * g + 5 * b)
```

### 📦 Similar problems

- CCC10J1 What is n, Daddy? (counting finger ways)
- CCC11J1 Which Alien? (nested conditionals)
- CCC19J1 Winning Score (comparing two teams)

%%Q9%%

:::callout icon=🧪
**OJ Practice**: read → code → submit → AC! That's all a J1 takes.
:::

%%O1%%
%%%%% C32
"Translate" a string according to rules: process character by character and build the result 🔤

### 📦 Worked example: CCC19J2 Time to Decompress

Each line is "a number N + a character c"; print c repeated N times:

```python
L = int(input())
for _ in range(L):
    n, c = input().split()
    print(c * int(n))
```

### 📦 Similar problems

- CCC15J3 Rövarspråket (double the consonants)
- CCC25J3 Product Codes (drop lowercase, keep uppercase, sum integers)
- CCC19J3 Cold Compress (run-length counting)

%%Q10%%

:::callout icon=🧪
**OJ Practice**: the core three lines are already above — AC it, then try Cold Compress as a step up.
:::

%%O2%%
%%%%% C33
When the data range is small, **trying every candidate exactly as the problem describes** is the correct solution 🔁

### 📦 Worked example: CCC13J3 From 1987 to 2013

Find the next year with all-distinct digits. Start from Y+1 and try year by year:

```python
y = int(input()) + 1
while len(set(str(y))) < len(str(y)):   # repeated digits found
    y += 1
print(y)
```

💡 `set(str(y))` removes duplicates — if it gets shorter, a digit repeated. The answer after 999 is 1023 (note 999 itself has only 3 digits, so compare the two lengths instead of hard-coding 4).

### 📦 Similar problems

- CCC11J2 Who Has Seen The Wind (try hour by hour until the balloon lands)
- CCC17J3 Exactly Electrical (enumerate the number of moves)

%%Q11%%

:::callout icon=🧪
**OJ Practice**: enumerate the years — watch out for the 999 → 1023 trap.
:::

%%O3%%
%%%%% C34
The problem gives you a sequence of events in time order; **replay them** and keep score 🕐

### 📦 Worked example: CCC15J4 Wait Time

The log contains `R X` (received a message from friend X), `S X` (sent one to X), `W t` (t seconds passed in between). Find how long each friend waited. Use a **dictionary to record each friend's "waiting start time"**:

```python
n = int(input())
t = 0                  # current time
start = {}             # friend -> time their message arrived
total = {}             # friend -> total waiting seconds
for _ in range(n):
    op, val = input().split()
    if op == "W":
        t += int(val)              # fast-forward
    else:
        t += 1                     # a normal event takes 1 second
        f = int(val)
        if op == "R":
            start[f] = t
        else:                      # S: settle the wait
            total[f] = total.get(f, 0) + t - start[f]
for f in sorted(total):
    print(f, total[f])
```

### 📦 Similar problems

- CCC16J4 Arrival Time (+45 minutes of time arithmetic)

%%Q12%%

:::callout icon=🧪
**OJ Practice**: follow the "dictionary bookkeeping" idea and fill in the details to AC it.
:::

%%O4%%
%%%%% C35
First master the **grid reading template** — step one of every grid problem 🗺️

```python
r = int(input())                       # number of rows
grid = [input() for _ in range(r)]     # read each row as a string
# access row i, column j: grid[i][j]
```

### 📦 Worked example: CCC18J4 Sunflowers

N sunflowers are ordered shortest to tallest (top to bottom in the table), but kids may have shuffled the rows. Recover the last column (final heights):

```python
n = int(input())
rows = [list(map(int, input().split())) for _ in range(n)]
rows.sort(key=lambda row: row[0])      # column 0 = day-1 height, short → tall
print(*[row[-1] for row in rows])
```

### 📦 Similar problems

- CCC20J3 Art (smallest frame around all points: min/max coordinates)
- CCC22J5 Square Pool (grid counting)
- CCC23J4 Trianglane (row-by-row counting)

%%Q13%%

%%Q19%%

:::callout icon=🧪
**OJ Practice**: practice "read the table + sort to recover".
:::

%%O5%%
%%%%% C36
Finding the **fewest steps** → BFS; finding **every reachable region** → DFS / Flood Fill 🔍

### ⚔️ BFS Template (CCC10J5 Knight Hop: fewest knight jumps)

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

💡 BFS expands layer by layer, so **the first time you reach a cell is with the fewest possible steps** — that's exactly why BFS solves "minimum moves".

### 🌾 Flood Fill (CCC24J5 Harvest Waterloo: collecting a region)

Start from the given cell, walk up/down/left/right wherever possible, and add up the value of every visited cell (`S`=1, `M`=5, `L`=10):

```python
def dfs(r, c):
    if r < 0 or r >= R or c < 0 or c >= C:
        return 0
    if grid[r][c] == '*' or seen[r][c]:
        return 0
    seen[r][c] = True
    total = value[grid[r][c]]
    for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        total += dfs(r + dr, c + dc)
    return total
```

### 📦 Similar problems

- CCC20J5 Escape Room (BFS on rooms)
- CCC23J5 CCC Word Hunt (find a word in a grid)

%%Q14%%

%%Q15%%

%%Q16%%

:::callout icon=🧪
**OJ Practice**: complete the input handling in the template and AC your first search problem.
:::

%%O6%%
%%%%% C37
Recursion = a function calling itself. Two essentials: a **base case** + **shrinking the problem** ♻️

```python
def f(n):                # factorial
    if n <= 1:           # ✅ base case (without it: infinite recursion)
        return 1
    return n * f(n - 1)  # smaller problem
```

### 📦 Similar problems

- CCC11J5 Unfriend (counting arrangements)
- CCC19J5 Rule of Three (rule replacement)
- CCC12J5 A Coin Game (backtracking over all moves)

:::callout icon=💡
For recursion problems, draw the "recursion tree" first: split the big problem into smaller ones of the same shape — once the tree is drawn, the code writes itself.
:::

%%Q17%%
%%%%% G4
Ready for the Senior paper? 🥇 The S problems reuse everything from the Junior types — but demand **faster implementation and stronger algorithms**.

- S1–S2: sorting, greedy, careful simulation — a strong Junior student can start here right away
- S3: heavier simulation with the right data structure (dict / set / deque)
- S4–S5: dynamic programming and graph algorithms

%%GQ4%%
%%%%% C41

| Problem | Core topic | Training focus |
| --- | --- | --- |
| S1 | simulation / sorting | translate the statement into code, carefully |
| S2 | enumeration / greedy | learn to sort first, then pair up |
| S3 | simulation + data structures | use dict / set / deque flexibly |
| S4 | DP / introductory graphs | state design and transitions |
| S5 | combined (graphs / data structures) | advanced algorithms + complexity |
%%%%% C42
📦 **Worked example: CCC16J5 Tandem Bicycle** — two countries each field N riders on tandem bikes; a bike's speed = the faster rider; minimize (d=0) or maximize (d=1) the total speed:

```python
n = int(input())
d = int(input())
dmoj = sorted(int(input()) for _ in range(n))
peg = sorted((int(input()) for _ in range(n)), reverse=(d == 1))
print(sum(max(a, b) for a, b in zip(dmoj, peg)))
```

💡 **Greedy idea**: to minimize the total → pair fastest with fastest (both ascending); to maximize → pair fastest with slowest (one ascending, one descending).

📦 **Similar problems**: CCC21J4 Arranging Books (minimum swaps — see the OJ Practice below)

%%Q18%%

:::callout icon=🧪
**OJ Practice**: count the misplaced books in the L / M / S zones and solve it with greedy swaps.
:::

%%O7%%
%%%%% G5
Your practice hub 📅 — every real problem indexed with a direct link to the OJ, plus a structured 14-day plan.

- 📚 17 Years of Real Problems (2010–2026) — the full index
- ✅ 14-Day Training Plan — day-by-day checklist

%%GQ5%%
%%%%% C51

%%INDEX_TABLE%%

:::callout icon=🎯
We recommend solving **from the newest years backwards**: 2024–2026 statements are the friendliest (J1 takes only 3 lines of input), perfect for warming up; older years' J4/J5 tend to be harder — save them until after you've studied each problem type. Click any problem ID in the table to jump straight to its OJ page.
:::
%%%%% C52

:::tasklist
- [ ] Days 1–2: 🐍 Syntax Toolbox + J1–J2 from 2024–2026
- [ ] Days 3–4: 🎯 Types 1 & 2 + matching J3 problems
- [ ] Days 5–6: 🔁 Type 3, 🕐 Type 4 + various J3/J4
- [ ] Days 7–8: 🗺️ Type 5 + the 2018/2022/2023 grid problems
- [ ] Days 9–10: 🔍 Type 6 (BFS / Flood Fill) + J5 search problems
- [ ] Day 11: ♻️ Type 7 recursion + J5 recursion problems
- [ ] Days 12–13: 🥇 S1–S2 greedy and sorting
- [ ] Day 14: 🏆 full mock of a complete Junior paper
:::
