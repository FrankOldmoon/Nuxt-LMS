/**
 * 构建 IB Computer Science 完整课程（course 19）写入 aics.oldmoon.cn
 *
 * 大纲：IB CS 新大纲（2024 首考 2026）— Theme A（A1-A4）+ Theme B（B1-B4）+ IA/Case Study
 * 结构：14 个分组（group）+ 49 个子章节，每章 2-3 道配套练习（题型多样）
 * 流程（参考 build_ccc_course.cjs）：
 *  1. 登录
 *  2. 幂等创建题目（checkpoint: storage/oj_problems/ibcs_qcids.json）
 *  3. 解析 scripts/ibcs_tutorial.md（%%%%% 分节），创建缺失章节（复用 id 588 作 "About IB Computer Science"）
 *  4. 写 orders 两级目录树 + 课程简介
 *  5. 逐章填充：markdown 保存 → 取回 → %%Q%% 标记替换为 vue 节点 → 结构自检 → 回存
 *
 * 用法：node scripts/build_ibcs_course.cjs
 */
const fs = require('fs')
const path = require('path')

const BASE = 'https://aics.oldmoon.cn'
const COURSE_ID = 19
const REUSE = { C01: 588 } // "About IB Computer Science" 复用已有章节 588
const OUT_DIR = path.join(__dirname, '..', 'storage', 'oj_problems')
const CHECKPOINT = path.join(OUT_DIR, 'ibcs_qcids.json')
const MD_FILE = path.join(__dirname, 'ibcs_tutorial.md')

let TOKEN = ''
async function api(p, method = 'GET', body) {
  const res = await fetch(BASE + p, {
    method,
    headers: { 'Content-Type': 'application/json', Cookie: `auth_token=${TOKEN}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json()
  if (!data.success) throw new Error(`${method} ${p}: ${data.msg || res.status}`)
  return data.data
}

/* ---------- tiptap 构建工具 ---------- */
const t = (text, marks) => ({ type: 'text', text, ...(marks ? { marks } : {}) })
const code = (text) => t(text, [{ type: 'code' }])
const p = (...children) => ({ type: 'paragraph', content: children.map((c) => (typeof c === 'string' ? t(c) : c)) })
const codeBlock = (language, ...lines) => ({ type: 'codeBlock', attrs: { language }, content: [t(lines.join('\n'))] })
const docOf = (...blocks) => ({ type: 'doc', content: blocks })
const inputNode = (ans) => ({ type: 'inputs', attrs: { content: ans } })
const selectNode = (ans) => ({ type: 'select', attrs: { content: ans } })

function validateContent(node, issues = []) {
  if (!node || typeof node !== 'object') return issues
  if (node.type === 'text') {
    if (typeof node.text !== 'string') issues.push('text.text is not a string')
    if (node.marks !== undefined && !Array.isArray(node.marks)) issues.push('marks is not an array')
  }
  if (node.type === 'heading' && !node.attrs?.id) issues.push('heading missing id: ' + (node.content?.[0]?.text || ''))
  if (node.type === 'codeBlock' && !node.attrs?.language) issues.push('codeBlock missing language')
  if (Array.isArray(node.content)) node.content.forEach((n) => validateContent(n, issues))
  else if (node.content && typeof node.content === 'object') validateContent(node.content, issues)
  return issues
}

/* ---------- 题目定义 ---------- */
const JUDGE = ['Correct ✅', 'Wrong ❌']
const CORRECT = [0]
const WRONG = [1]
const sortAns = (n) => Array.from({ length: n }, (_, i) => i)
const matchAns = (n) => Array.from({ length: n }, (_, i) => i)

const QUESTIONS = [
  /* ===== C01 About IB Computer Science ===== */
  { key: 'Q1', type: 'judge',
    content: docOf(p('Computational thinking is the central organising concept of the IB Computer Science course.')),
    options: JUDGE, answer: CORRECT },
  { key: 'Q2', type: 'single',
    content: docOf(p('Which of these belongs to Theme A (Concepts of Computer Science)?')),
    options: ['Object-oriented programming', 'Networks', 'Algorithm design', 'Recursion'], answer: [1],
    explanation: docOf(p('Networks (A2) is part of Theme A. OOP and algorithm design belong to Theme B.')) },
  /* ===== C02 Assessment Overview ===== */
  { key: 'Q3', type: 'single',
    content: docOf(p('Which paper focuses on reading, tracing, writing and debugging code?')),
    options: ['Paper 1', 'Paper 2', 'Paper 3', 'No paper involves code'], answer: [1],
    explanation: docOf(p('Paper 2 is the programming paper — trace, write and debug code in your chosen language.')) },
  { key: 'Q4', type: 'fill',
    content: docOf(p('The Internal Assessment is a working software product built for a real ', inputNode('client'), '.')),
    options: [''], answer: ['client'] },
  /* ===== C03 What is Computational Thinking ===== */
  { key: 'Q5', type: 'single',
    content: docOf(p('Which list contains the four pillars of computational thinking in the correct order?')),
    options: ['Decomposition → Pattern recognition → Abstraction → Algorithm design',
      'Abstraction → Decomposition → Pattern recognition → Algorithm design',
      'Pattern recognition → Decomposition → Algorithm design → Abstraction',
      'Algorithm design → Abstraction → Decomposition → Pattern recognition'], answer: [0] },
  { key: 'Q6', type: 'judge',
    content: docOf(p('Computational thinking always requires writing a program.')),
    options: JUDGE, answer: WRONG,
    explanation: docOf(p('CT is a way of thinking that can be applied to any problem — programming is just one way to express the result.')) },
  /* ===== C04 Problem Specification & Decomposition ===== */
  { key: 'Q7', type: 'fill',
    content: docOf(p('Stating the Input → Process → ', inputNode('output'), ' of a problem is the first step of problem specification.')),
    options: [''], answer: ['output'] },
  { key: 'Q8', type: 'single',
    content: docOf(p('A school wants a canteen ordering app. Which is the best decomposition?')),
    options: ['Menu display / Order taking / Payment / Sales report — each solved separately',
      'One giant program written by one person in one go',
      'Only think about payment, add other features later if there is time',
      'Split the app by the favourite colours of the developers'], answer: [0],
    explanation: docOf(p('Good decomposition produces independent, testable sub-problems.')) },
  /* ===== C05 Pattern Recognition & Abstraction ===== */
  { key: 'Q9', type: 'single',
    content: docOf(p('You wrote a "highest score" program before. Now you must find the most popular dish, and you notice the two solutions are similar. Which CT strategy is this?')),
    options: ['Abstraction', 'Pattern recognition', 'Decomposition', 'Debugging'], answer: [1] },
  { key: 'Q10', type: 'classify',
    content: docOf(p('🧹 You are designing a school timetable algorithm. Classify each detail:')),
    options: [
      { name: 'Essential ✅', items: ['Teachers', 'Classrooms', 'Time slots'] },
      { name: 'Irrelevant ❌', items: ['Teachers\' hair colour', 'Room paint colour'] }],
    answer: [0, 0, 0, 1, 1],
    explanation: docOf(p('Abstraction keeps what affects the timetable and drops what does not.')) },
  /* ===== C06 Algorithms, Pseudocode & Flowcharts ===== */
  { key: 'Q11', type: 'match',
    content: docOf(p('🗺️ Match each flowchart symbol to its meaning:')),
    options: [
      { left: 'Start / Stop', right: 'Oval' },
      { left: 'Input / Output', right: 'Parallelogram' },
      { left: 'Process', right: 'Rectangle' },
      { left: 'Decision', right: 'Diamond' }],
    answer: matchAns(4) },
  { key: 'Q12', type: 'fill',
    content: docOf(p('In IB pseudocode, the keyword used to display a value is ', inputNode('output'), '.')),
    options: [''], answer: ['output'] },
  { key: 'Q13', type: 'sort',
    content: docOf(p('📐 Put the problem-solving workflow in the right order:')),
    options: ['Specify input, process and output', 'Decompose the problem', 'Design the algorithm', 'Test and refine the solution'],
    answer: sortAns(4) },
  /* ===== C07 Variables & Data Types ===== */
  { key: 'Q14', type: 'single',
    content: docOf(p('Which is a valid Python variable name?')),
    options: ['2cool', 'class', 'student_age', 'my-score'], answer: [2],
    explanation: docOf(p('Names cannot start with a digit, be reserved words, or contain hyphens.')) },
  { key: 'Q15', type: 'fill',
    content: docOf(p('The data type of the value 3.14 is ', inputNode('float'), '.')),
    options: [''], answer: ['float'] },
  /* ===== C08 Operators & Expressions ===== */
  { key: 'Q16', type: 'fill',
    content: docOf(p('In Python, ', code('17 // 5'), ' evaluates to ', inputNode('3'), '.')),
    options: [''], answer: ['3'] },
  { key: 'Q17', type: 'multiple',
    content: docOf(p('Which expressions evaluate to ', code('True'), ' when ', code('x = 7'), '?')),
    options: ['`x % 2 == 1`', '`x > 10`', '`x != 7`', '`x >= 7`'], answer: [0, 3],
    explanation: docOf(p('7 % 2 = 1 so the first is True; 7 >= 7 is True. 7 > 10 and 7 != 7 are False.')) },
  /* ===== C09 Input & Output ===== */
  { key: 'Q18', type: 'judge',
    content: docOf(p('input() always returns a string, even when the user types digits.')),
    options: JUDGE, answer: CORRECT,
    explanation: docOf(p('Convert with int() or float() before doing maths.')) },
  { key: 'Q19', type: 'select',
    content: docOf(p('Given ', code('a = 10'), ' and ', code('b = 20'), ', which line prints ', code('Total: 30'), '? ', selectNode('print(f"Total: {a + b}")'))),
    options: ['print(f"Total: {a + b}")', 'print("Total: a + b")', 'print(Total: {a + b})', 'print(f"Total: a + b")'], answer: ['print(f"Total: {a + b}")'],
    explanation: docOf(p('Inside an f-string, {a + b} is evaluated; without the f or the braces it is just text.')) },
  /* ===== C10 Errors & Exceptions ===== */
  { key: 'Q20', type: 'single',
    content: docOf(p('A program starts fine but crashes at ', code('10 / 0'), '. Which type of error is this?')),
    options: ['Syntax error', 'Runtime error', 'Logic error', 'No error at all'], answer: [1],
    explanation: docOf(p('It compiles but crashes while running — a runtime error (ZeroDivisionError).')) },
  { key: 'Q21', type: 'fill',
    content: docOf(p('Complete the exception handler: ', code('try: ...'), ' ', code('except ValueError:'), ' — the keyword that introduces the error-handling block is ', inputNode('except'), '.')),
    options: [''], answer: ['except'] },
  /* ===== C11 Tracing Code ===== */
  { key: 'Q22', type: 'single',
    content: docOf(p('Trace this code — what does it print?'),
      codeBlock('python', 'x = 2', 'y = 3', 'x = x + y', 'y = x - y', 'print(x, y)')),
    options: ['5 2', '2 3', '5 5', '3 2'], answer: [0],
    explanation: docOf(p('x = 2+3 = 5; y = 5-3 = 2. Output: 5 2.')) },
  { key: 'Q23', type: 'fill',
    content: docOf(p('What does this loop print?'), codeBlock('python', 'total = 0', 'for i in range(1, 5):', '    total += i', 'print(total)'),
      p('Answer: ', inputNode('10'))),
    options: [''], answer: ['10'],
    explanation: docOf(p('range(1, 5) gives 1, 2, 3, 4 → 1+2+3+4 = 10.')) },
  /* ===== C12 Selection ===== */
  { key: 'Q24', type: 'single',
    content: docOf(p('Using the grade code from the chapter, what prints when ', code('score = 75'), '?')),
    options: ['Grade 7 ⭐', 'Grade 5–6', 'Grade 3–4', 'Try again 💪'], answer: [1],
    explanation: docOf(p('75 >= 90 is False, 75 >= 75 is True → first matching branch wins.')) },
  { key: 'Q25', type: 'judge',
    content: docOf(p('In an if / elif / else chain, at most one branch runs.')),
    options: JUDGE, answer: CORRECT },
  /* ===== C13 for Loops ===== */
  { key: 'Q26', type: 'fill',
    content: docOf(p('How many numbers does ', code('range(1, 10, 2)'), ' produce? ', inputNode('5'))),
    options: [''], answer: ['5'],
    explanation: docOf(p('1, 3, 5, 7, 9 — five numbers.')) },
  { key: 'Q27', type: 'single',
    content: docOf(p('What does this print?'),
      codeBlock('python', 'total = 0', 'for i in range(2, 11, 2):', '    total += i', 'print(total)')),
    options: ['30', '25', '45', '55'], answer: [0],
    explanation: docOf(p('2+4+6+8+10 = 30.')) },
  /* ===== C14 while Loops ===== */
  { key: 'Q28', type: 'judge',
    content: docOf(p('A while loop whose condition never becomes False runs forever (an infinite loop).')),
    options: JUDGE, answer: CORRECT },
  { key: 'Q29', type: 'single',
    content: docOf(p('Which statement immediately exits the current loop?')),
    options: ['continue', 'break', 'exit()', 'stop'], answer: [1],
    explanation: docOf(p('break exits the loop; continue skips to the next iteration.')) },
  /* ===== C15 Functions & Modularity ===== */
  { key: 'Q30', type: 'fill',
    content: docOf(p('The Python keyword that sends a value back from a function to the caller is ', inputNode('return'), '.')),
    options: [''], answer: ['return'] },
  { key: 'Q31', type: 'single',
    content: docOf(p('Why is ', code('return'), ' often better than ', code('print'), ' inside a function?')),
    options: ['The returned value can be stored and reused by the caller',
      'print is not allowed inside functions',
      'return makes the program run faster',
      'There is no difference'], answer: [0] },
  /* ===== C16 Static vs Dynamic ===== */
  { key: 'Q32', type: 'judge',
    content: docOf(p("A static data structure's size is fixed when it is created.")),
    options: JUDGE, answer: CORRECT },
  { key: 'Q33', type: 'classify',
    content: docOf(p('🧱 Classify each data structure:')),
    options: [
      { name: 'Static 🧱', items: ['Array in Java (fixed length)', 'Fixed-size buffer'] },
      { name: 'Dynamic 🌊', items: ['Python list', 'Linked list'] }],
    answer: [0, 0, 1, 1] },
  /* ===== C17 Lists & Arrays (1D) ===== */
  { key: 'Q34', type: 'fill',
    content: docOf(p('The index of the first element of a list is ', inputNode('0'), '.')),
    options: [''], answer: ['0'] },
  { key: 'Q35', type: 'single',
    content: docOf(p('What does this print?'),
      codeBlock('python', 'nums = [4, 8, 15, 16, 23]', 'print(nums[2] + nums[-1])')),
    options: ['38', '39', '31', '7'], answer: [0],
    explanation: docOf(p('nums[2] = 15, nums[-1] = 23 → 38.')) },
  /* ===== C18 2D Arrays ===== */
  { key: 'Q36', type: 'fill',
    content: docOf(p('Given ', code('grid = [[9, 4, 7], [2, 8, 5]]'), ', what is ', code('grid[0][2]'), '? ', inputNode('7'))),
    options: [''], answer: ['7'],
    explanation: docOf(p('Row 0 is [9, 4, 7]; column 2 is 7.')) },
  { key: 'Q37', type: 'single',
    content: docOf(p('Which loop pattern visits every cell of a 2D array?')),
    options: ['One single loop over all values', 'Nested loops: outer over rows, inner over columns', 'A while loop that never ends', 'Recursion is the only way'], answer: [1] },
  /* ===== C19 Stacks & Queues ===== */
  { key: 'Q38', type: 'match',
    content: docOf(p('🥞 Match each operation pair to its structure:')),
    options: [
      { left: 'push / pop', right: 'Stack' },
      { left: 'enqueue / dequeue', right: 'Queue' },
      { left: 'open / write / close', right: 'File' }],
    answer: matchAns(3) },
  { key: 'Q39', type: 'single',
    content: docOf(p('Print jobs must come out in the order they were sent. Which structure fits best?')),
    options: ['Stack (LIFO)', 'Queue (FIFO)', 'Binary tree', 'Boolean'], answer: [1] },
  /* ===== C20 Big O ===== */
  { key: 'Q40', type: 'single',
    content: docOf(p('What is the time complexity of binary search?')),
    options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], answer: [1],
    explanation: docOf(p('Each step halves the search space → logarithmic.')) },
  { key: 'Q41', type: 'match',
    content: docOf(p('📈 Match each algorithm to its Big O:')),
    options: [
      { left: 'Linear search', right: 'O(n)' },
      { left: 'Binary search', right: 'O(log n)' },
      { left: 'Bubble sort', right: 'O(n²)' },
      { left: 'Accessing list[3]', right: 'O(1)' }],
    answer: matchAns(4) },
  /* ===== C21 Search ===== */
  { key: 'Q42', type: 'sort',
    content: docOf(p('🏃 Put the binary search steps in the right order:')),
    options: ['Find the middle element', 'Compare it with the target', 'Discard the half that cannot contain the target', 'Repeat until found or the range is empty'],
    answer: sortAns(4) },
  { key: 'Q43', type: 'judge',
    content: docOf(p('Binary search works on any list, sorted or not.')),
    options: JUDGE, answer: WRONG,
    explanation: docOf(p('It requires sorted data — that is how "discard half" stays safe.')) },
  /* ===== C22 Sorting ===== */
  { key: 'Q44', type: 'single',
    content: docOf(p('After the FIRST pass of bubble sort on [5, 3, 8, 1], the list is:')),
    options: ['[3, 5, 1, 8]', '[1, 3, 5, 8]', '[3, 5, 8, 1]', '[1, 5, 3, 8]'], answer: [0],
    explanation: docOf(p('Pass 1: (5,3)→swap, (5,8)→no, (8,1)→swap → [3, 5, 1, 8].')) },
  { key: 'Q45', type: 'fill',
    content: docOf(p('Selection sort on a list of 5 elements performs at most ', inputNode('4'), ' swaps.')),
    options: [''], answer: ['4'],
    explanation: docOf(p('One swap per pass, n − 1 passes.')) },
  /* ===== C23 Recursion ===== */
  { key: 'Q46', type: 'fill',
    content: docOf(p('Every recursive function must have a ', inputNode('base'), ' case that stops the recursion.')),
    options: [''], answer: ['base'] },
  { key: 'Q47', type: 'single',
    content: docOf(p('What does ', code('factorial(4)'), ' return in the chapter code?')),
    options: ['10', '16', '24', 'infinite recursion'], answer: [2],
    explanation: docOf(p('4 × 3 × 2 × 1 = 24.')) },
  /* ===== C24 File Processing ===== */
  { key: 'Q48', type: 'fill',
    content: docOf(p('To write to a file, erasing its old contents, open it with mode ', inputNode('w'), '.')),
    options: [''], answer: ['w'],
    explanation: docOf(p('"w" overwrites; "a" appends; "r" reads.')) },
  { key: 'Q49', type: 'single',
    content: docOf(p('What does ', code('f.readlines()'), ' return?')),
    options: ['A string with the whole file', 'A list of all lines', 'The number of lines', 'The last line only'], answer: [1] },
  /* ===== C25 Classes & Objects ===== */
  { key: 'Q50', type: 'fill',
    content: docOf(p('The Python keyword used to define a class is ', inputNode('class'), '.')),
    options: [''], answer: ['class'] },
  { key: 'Q51', type: 'single',
    content: docOf(p('What is the constructor method called in Python classes?')),
    options: ['__start__', '__constructor__', '__init__', 'new'], answer: [2] },
  /* ===== C26 Encapsulation ===== */
  { key: 'Q52', type: 'single',
    content: docOf(p('Encapsulation mainly protects…')),
    options: ['the CPU from overheating', 'data from uncontrolled external changes', 'strings from concatenation', 'loops from ending'], answer: [1] },
  { key: 'Q53', type: 'fill',
    content: docOf(p('Inside a class, the parameter referring to the current object is conventionally named ', inputNode('self'), '.')),
    options: [''], answer: ['self'] },
  /* ===== C27 Inheritance & Polymorphism ===== */
  { key: 'Q54', type: 'judge',
    content: docOf(p('Inheritance models an "is-a" relationship (a Dog is an Animal).')),
    options: JUDGE, answer: CORRECT },
  { key: 'Q55', type: 'single',
    content: docOf(p('What is polymorphism?')),
    options: ['One variable holding many data types at once',
      'The same method call behaving differently depending on the object\'s actual class',
      'Writing many functions with the same name in one class',
      'Copying objects many times'], answer: [1] },
  /* ===== C28 Multiple Classes & Design ===== */
  { key: 'Q56', type: 'classify',
    content: docOf(p('🧩 Classify each relationship:')),
    options: [
      { name: 'Composition (part cannot exist alone)', items: ['House – Room', 'Car – Engine (built in)'] },
      { name: 'Aggregation (part exists independently)', items: ['Course – Student', 'Library – Book'] }],
    answer: [0, 0, 1, 1] },
  { key: 'Q57', type: 'single',
    content: docOf(p('Design patterns are…')),
    options: ['visual themes for user interfaces',
      'reusable solutions to recurring design problems',
      'errors that repeat in every program',
      'passwords for developers'], answer: [1] },
  /* ===== C29 Linked Lists ===== */
  { key: 'Q58', type: 'fill',
    content: docOf(p('Each node of a linked list stores data and a ', inputNode('pointer'), ' to the next node.')),
    options: [''], answer: ['pointer'] },
  { key: 'Q59', type: 'single',
    content: docOf(p('Which is an advantage of linked lists over arrays?')),
    options: ['Faster direct access to the i-th element', 'O(1) insert/delete at the front by rewiring pointers', 'Uses less memory per element', 'They keep data sorted automatically'], answer: [1] },
  /* ===== C30 BST ===== */
  { key: 'Q60', type: 'judge',
    content: docOf(p('In a BST, the left subtree of a node contains keys smaller than the node itself.')),
    options: JUDGE, answer: CORRECT },
  { key: 'Q61', type: 'single',
    content: docOf(p('Which traversal visits BST values in sorted order?')),
    options: ['Pre-order', 'In-order', 'Post-order', 'Random walk'], answer: [1],
    explanation: docOf(p('Left → node → right visits keys ascending.')) },
  /* ===== C31 CPU & FDE ===== */
  { key: 'Q62', type: 'sort',
    content: docOf(p('⚙️ Put the FDE cycle steps in order:')),
    options: ['Fetch the instruction from memory', 'Decode it in the Control Unit', 'Execute it in the ALU / hardware'],
    answer: sortAns(3) },
  { key: 'Q63', type: 'single',
    content: docOf(p('Which CPU component performs arithmetic and comparisons?')),
    options: ['Control Unit', 'ALU', 'GPU', 'Register'], answer: [1] },
  /* ===== C32 Secondary Memory ===== */
  { key: 'Q64', type: 'classify',
    content: docOf(p('🗜️ Classify each format:')),
    options: [
      { name: 'Lossless', items: ['ZIP', 'PNG'] },
      { name: 'Lossy', items: ['JPEG', 'MP3'] }],
    answer: [0, 0, 1, 1] },
  { key: 'Q65', type: 'single',
    content: docOf(p('Which is a characteristic of cloud computing?')),
    options: ['Data is stored only on one physical machine',
      'Resources can scale on demand over the internet',
      'It works without any internet connection',
      'It is always less secure than local storage'], answer: [1] },
  /* ===== C33 Binary & Hex ===== */
  { key: 'Q66', type: 'fill',
    content: docOf(p('Binary 1011 = ', inputNode('11'), ' in denary.')),
    options: [''], answer: ['11'],
    explanation: docOf(p('8 + 0 + 2 + 1 = 11.')) },
  { key: 'Q67', type: 'fill',
    content: docOf(p('Hexadecimal FF = ', inputNode('255'), ' in denary.')),
    options: [''], answer: ['255'],
    explanation: docOf(p('15 × 16 + 15 = 255.')) },
  { key: 'Q68', type: 'single',
    content: docOf(p('One hex digit represents exactly how many bits?')),
    options: ['2', '4', '8', '16'], answer: [1] },
  /* ===== C34 Logic Gates ===== */
  { key: 'Q69', type: 'fill',
    content: docOf(p('1 AND 0 = ', inputNode('0'), '.')),
    options: [''], answer: ['0'] },
  { key: 'Q70', type: 'match',
    content: docOf(p('🚦 Match each gate to its behaviour:')),
    options: [
      { left: 'Outputs 1 only when both inputs are 1', right: 'AND' },
      { left: 'Inverts the input', right: 'NOT' },
      { left: 'Outputs 1 when inputs differ', right: 'XOR' },
      { left: 'Outputs 1 when at least one input is 1', right: 'OR' }],
    answer: matchAns(4) },
  { key: 'Q71', type: 'judge',
    content: docOf(p('XOR outputs 1 when both inputs are the same.')),
    options: JUDGE, answer: WRONG,
    explanation: docOf(p('XOR outputs 1 when inputs are different.')) },
  /* ===== C35 Operating Systems ===== */
  { key: 'Q72', type: 'single',
    content: docOf(p('Which scheduling algorithm gives each process a fixed time slice in turn?')),
    options: ['First-Come-First-Served', 'Round robin', 'Priority', 'Random'], answer: [1] },
  { key: 'Q73', type: 'judge',
    content: docOf(p('An interrupt is a signal that lets the OS respond immediately to events like key presses.')),
    options: JUDGE, answer: CORRECT },
  /* ===== C36 Control Systems ===== */
  { key: 'Q74', type: 'sort',
    content: docOf(p('🔁 Put the feedback loop steps in order:')),
    options: ['Sensor reads the current value', 'Computer compares it with the set point', 'Actuator adjusts the process', 'Repeat continuously'],
    answer: sortAns(4) },
  { key: 'Q75', type: 'fill',
    content: docOf(p('The component that carries out physical actions (motors, valves) is called an ', inputNode('actuator'), '.')),
    options: [''], answer: ['actuator'] },
  /* ===== C37 Compilers & Interpreters ===== */
  { key: 'Q76', type: 'classify',
    content: docOf(p('🌐 Classify each trait:')),
    options: [
      { name: 'Compiler 🏭', items: ['Translates the whole program at once', 'Produces an executable file'] },
      { name: 'Interpreter 🎤', items: ['Runs line by line', 'Stops at the first error found'] }],
    answer: [0, 0, 1, 1] },
  { key: 'Q77', type: 'single',
    content: docOf(p('Which approach compiles to intermediate bytecode run on a virtual machine?')),
    options: ['Pure compilation (C)', 'Pure interpretation (shell scripts)', 'Hybrid bytecode (Java, Python)', 'Hand assembly'], answer: [2] },
  /* ===== C38 Network Fundamentals ===== */
  { key: 'Q78', type: 'classify',
    content: docOf(p('🏘️ Classify each network scenario:')),
    options: [
      { name: 'LAN 🏠', items: ['School computer lab network', 'Home Wi-Fi'] },
      { name: 'WAN 🌍', items: ['A multinational company linking offices across countries', 'The internet backbone connecting cities'] }],
    answer: [0, 0, 1, 1] },
  { key: 'Q79', type: 'single',
    content: docOf(p('What does a VPN provide?')),
    options: ['Faster hardware', 'An encrypted tunnel making a remote device behave as if inside the private network', 'Unlimited download speed', 'A new IP address forever'], answer: [1] },
  /* ===== C40 Network Architecture ===== */
  { key: 'Q80', type: 'single',
    content: docOf(p('Which topology connects every device to a central switch/hub?')),
    options: ['Bus', 'Star', 'Mesh', 'Ring'], answer: [1] },
  { key: 'Q81', type: 'judge',
    content: docOf(p('In client-server networks, the server is a potential single point of failure.')),
    options: JUDGE, answer: CORRECT },
  /* ===== C41 Data Transmission ===== */
  { key: 'Q82', type: 'sort',
    content: docOf(p('✉️ Put the journey of a file across the internet in order:')),
    options: ['The file is split into packets', 'Each packet is routed independently across the network', 'The receiver reassembles the packets in order'],
    answer: sortAns(3) },
  { key: 'Q83', type: 'fill',
    content: docOf(p('The 128-bit addressing scheme designed to replace IPv4 is ', inputNode('IPv6'), '.')),
    options: [''], answer: ['IPv6'] },
  /* ===== C42 Network Security ===== */
  { key: 'Q84', type: 'multiple',
    content: docOf(p('Which are good security practices?')),
    options: ['Use two-factor authentication', 'Keep software updated', 'Share passwords with friends', 'Click links in emails from unknown senders'], answer: [0, 1] },
  { key: 'Q85', type: 'single',
    content: docOf(p('An email pretending to be your bank asks for your password. This is:')),
    options: ['Phishing', 'Encryption', 'A firewall alert', 'Packet switching'], answer: [0] },
  /* ===== C43 Database Fundamentals ===== */
  { key: 'Q86', type: 'fill',
    content: docOf(p('The field that uniquely identifies each record in a table is the ', inputNode('primary'), ' key.')),
    options: [''], answer: ['primary'] },
  { key: 'Q87', type: 'judge',
    content: docOf(p('A foreign key in one table references the primary key of another table.')),
    options: JUDGE, answer: CORRECT },
  /* ===== C44 Database Design ===== */
  { key: 'Q88', type: 'single',
    content: docOf(p('Which goal does normalization (up to 3NF) achieve?')),
    options: ['Make the database run without any tables',
      'Each piece of data lives in exactly one place — no redundancy',
      'Store everything in one giant table',
      'Remove all primary keys'], answer: [1] },
  { key: 'Q89', type: 'fill',
    content: docOf(p('In an ERD, a many-to-many relationship is usually implemented with a ', inputNode('junction'), ' table.')),
    options: [''], answer: ['junction'] },
  /* ===== C45 SQL ===== */
  { key: 'Q90', type: 'single',
    content: docOf(p('Which SQL statement combines rows from two tables based on a matching column?')),
    options: ['MERGE', 'JOIN', 'COMBINE', 'UNION ALL'], answer: [1] },
  { key: 'Q91', type: 'select',
    content: docOf(p('To list all columns of students, write: ', code('SELECT'), ' ', selectNode('*'), ' ', code('FROM students;'))),
    options: ['*', 'ALL', 'columns()', '%'], answer: ['*'] },
  /* ===== C46 Warehouses (HL) ===== */
  { key: 'Q92', type: 'judge',
    content: docOf(p('A key-value store trades rich querying for extremely fast lookups.')),
    options: JUDGE, answer: CORRECT },
  { key: 'Q93', type: 'single',
    content: docOf(p('A data warehouse with OLAP is optimised for…')),
    options: ['fast everyday transactions', 'historical, analytical queries across many dimensions', 'storing images only', 'replacing all backups'], answer: [1] },
  /* ===== C47 ML Fundamentals ===== */
  { key: 'Q94', type: 'classify',
    content: docOf(p('🧠 Classify each ML task:')),
    options: [
      { name: 'Supervised 🏷️', items: ['Spam filtering with labelled emails', 'House price prediction'] },
      { name: 'Unsupervised 🧩', items: ['Clustering customers into groups', 'Anomaly detection in logs'] }],
    answer: [0, 0, 1, 1] },
  { key: 'Q95', type: 'single',
    content: docOf(p('Which approach needs labelled training data?')),
    options: ['Supervised learning', 'Unsupervised learning', 'Random guessing', 'File compression'], answer: [0] },
  /* ===== C48 Ethics ===== */
  { key: 'Q96', type: 'single',
    content: docOf(p('A hiring model trained on biased historical data downranks women. This is an example of:')),
    options: ['Algorithmic bias', 'Overfitting', 'Encryption', 'Data compression'], answer: [0] },
  { key: 'Q97', type: 'multiple',
    content: docOf(p('Which are responsible ML practices?')),
    options: ['Use diverse training data', 'Keep human oversight for high-stakes decisions', 'Hide how the model decides', 'Collect as much personal data as possible'], answer: [0, 1] },
  /* ===== C49 IA ===== */
  { key: 'Q98', type: 'sort',
    content: docOf(p('🧩 Put the IA development process in order:')),
    options: ['Consult the client and set success criteria', 'Design the solution', 'Develop and test iteratively', 'Evaluate against the criteria'],
    answer: sortAns(4) },
  { key: 'Q99', type: 'single',
    content: docOf(p('Which IA criterion contains the video of the actual product working?')),
    options: ['Criterion A', 'Criterion C', 'Criterion D', 'Criterion F'], answer: [2] },
  /* ===== C50 Case Study ===== */
  { key: 'Q100', type: 'judge',
    content: docOf(p('The case study booklet is pre-released by the IB before the exam.')),
    options: JUDGE, answer: CORRECT },
  { key: 'Q101', type: 'select',
    content: docOf(p('The best first step when constructing an algorithm in an exam is: ', selectNode('State input, process and output, then plan the steps'))),
    options: ['Start typing code immediately', 'State input, process and output, then plan the steps', 'Memorise a random program', 'Skip the question'], answer: ['State input, process and output, then plan the steps'] },
  /* ===== Group overview questions ===== */
  { key: 'GQ2', type: 'judge',
    content: docOf(p('Computational thinking is only useful when programming a computer.')),
    options: JUDGE, answer: WRONG },
  { key: 'GQ3', type: 'single',
    content: docOf(p('Which programming language do we use in this course?')),
    options: ['Python', 'Java', 'C++', 'Scratch'], answer: [0] },
  { key: 'GQ4', type: 'single',
    content: docOf(p('Which three control structures build every program?')),
    options: ['Sequence, selection, iteration', 'Input, output, storage', 'CPU, RAM, disk', 'Classes, objects, methods'], answer: [0] },
  { key: 'GQ5', type: 'judge',
    content: docOf(p('Python lists are dynamic — they grow and shrink at runtime.')),
    options: JUDGE, answer: CORRECT },
  { key: 'GQ6', type: 'single',
    content: docOf(p('Which notation describes how algorithm cost grows with input size?')),
    options: ['Big O notation', 'HTML', 'IP address', 'QR code'], answer: [0] },
  { key: 'GQ7', type: 'judge',
    content: docOf(p('A class is a blueprint from which objects are created.')),
    options: JUDGE, answer: CORRECT },
  { key: 'GQ8', type: 'single',
    content: docOf(p('Theme B4 (Abstract Data Types) is studied by…')),
    options: ['SL students only', 'HL students only', 'Neither level', 'Both levels with identical content'], answer: [1] },
  { key: 'GQ9', type: 'single',
    content: docOf(p('How many bits are in one byte?')),
    options: ['4', '8', '16', '1024'], answer: [1] },
  { key: 'GQ10', type: 'judge',
    content: docOf(p('The operating system manages hardware resources and provides the user interface.')),
    options: JUDGE, answer: CORRECT },
  { key: 'GQ11', type: 'single',
    content: docOf(p('Which network type covers a single site like a school?')),
    options: ['WAN', 'LAN', 'VPN', 'OLAP'], answer: [1] },
  { key: 'GQ12', type: 'single',
    content: docOf(p('Which language is the standard for relational databases?')),
    options: ['HTML', 'SQL', 'Python', 'HTTP'], answer: [1] },
  { key: 'GQ13', type: 'judge',
    content: docOf(p('Machine learning systems improve from data rather than explicit programming.')),
    options: JUDGE, answer: CORRECT },
  { key: 'GQ14', type: 'judge',
    content: docOf(p('The IA product must be developed for a real client.')),
    options: JUDGE, answer: CORRECT },
]

/* ---------- 章节定义 ---------- */
const CHAPTERS = [
  { key: 'C01', name: 'About IB Computer Science' },
  { key: 'C02', name: 'Assessment Overview' },
  { key: 'G02', name: 'Computational Thinking', group: true },
  { key: 'C03', name: 'What is Computational Thinking' },
  { key: 'C04', name: 'Problem Specification & Decomposition' },
  { key: 'C05', name: 'Pattern Recognition & Abstraction' },
  { key: 'C06', name: 'Algorithms, Pseudocode & Flowcharts' },
  { key: 'G03', name: 'Programming Fundamentals', group: true },
  { key: 'C07', name: 'Variables & Data Types' },
  { key: 'C08', name: 'Operators & Expressions' },
  { key: 'C09', name: 'Input & Output' },
  { key: 'C10', name: 'Errors & Exceptions' },
  { key: 'C11', name: 'Tracing Code' },
  { key: 'G04', name: 'Programming Constructs', group: true },
  { key: 'C12', name: 'Selection: if, elif, else' },
  { key: 'C13', name: 'for Loops & range()' },
  { key: 'C14', name: 'while Loops' },
  { key: 'C15', name: 'Functions & Modularity' },
  { key: 'G05', name: 'Data Structures', group: true },
  { key: 'C16', name: 'Static vs Dynamic Structures' },
  { key: 'C17', name: 'Lists & Arrays (1D)' },
  { key: 'C18', name: '2D Arrays (Grids)' },
  { key: 'C19', name: 'Stacks & Queues' },
  { key: 'G06', name: 'Algorithms & Files', group: true },
  { key: 'C20', name: 'Algorithm Efficiency & Big O' },
  { key: 'C21', name: 'Linear & Binary Search' },
  { key: 'C22', name: 'Bubble & Selection Sort' },
  { key: 'C23', name: 'Recursion (HL)' },
  { key: 'C24', name: 'File Processing' },
  { key: 'G07', name: 'Object-Oriented Programming', group: true },
  { key: 'C25', name: 'Classes & Objects' },
  { key: 'C26', name: 'Encapsulation & Methods' },
  { key: 'C27', name: 'Inheritance & Polymorphism (HL)' },
  { key: 'C28', name: 'Multiple Classes & Design (HL)' },
  { key: 'C29', top: true, name: 'Linked Lists (HL)' },
  { key: 'C30', top: true, name: 'Binary Search Trees (HL)' },
  { key: 'G09', name: 'Computer Fundamentals', group: true },
  { key: 'C31', name: 'CPU & the Fetch-Decode-Execute Cycle' },
  { key: 'C32', name: 'Secondary Memory, Compression & the Cloud' },
  { key: 'C33', name: 'Binary & Hexadecimal' },
  { key: 'C34', name: 'Logic Gates & Truth Tables' },
  { key: 'G10', name: 'Operating & Control Systems', group: true },
  { key: 'C35', name: 'Operating Systems' },
  { key: 'C36', name: 'Control Systems (HL)' },
  { key: 'C37', name: 'Compilers & Interpreters (HL)' },
  { key: 'G11', name: 'Networks', group: true },
  { key: 'C38', name: 'Network Fundamentals' },
  { key: 'C40', name: 'Network Architecture' },
  { key: 'C41', name: 'Data Transmission' },
  { key: 'C42', name: 'Network Security' },
  { key: 'G12', name: 'Databases', group: true },
  { key: 'C43', name: 'Database Fundamentals' },
  { key: 'C44', name: 'Database Design: ERDs & Normalization' },
  { key: 'C45', name: 'SQL: Querying & Manipulating Data' },
  { key: 'C46', name: 'Alternative Databases & Warehouses (HL)' },
  { key: 'C47', top: true, name: 'Machine Learning Fundamentals' },
  { key: 'C48', top: true, name: 'Ethics & Impact of ML' },
  { key: 'C49', top: true, name: 'The Internal Assessment: Software Solution' },
  { key: 'C50', top: true, name: 'The Case Study & Exam Strategy' },
]

/* ---------- 解析 md → { key: markdown } ---------- */
function parseSections() {
  const raw = fs.readFileSync(MD_FILE, 'utf8')
  const sections = {}
  let cur = null
  for (const line of raw.split('\n')) {
    const m = line.match(/^%%%%%\s*(\S+)\s*/)
    if (m) { cur = m[1]; sections[cur] = []; continue }
    if (cur) sections[cur].push(line)
  }
  for (const k of Object.keys(sections)) sections[k] = sections[k].join('\n').trim()
  return sections
}

/** 抽取某节 markdown 里的 %%KEY%% 标记 */
function extractMarkers(md) {
  const keys = []
  for (const line of md.split('\n')) {
    const m = line.match(/^%%([A-Z0-9]+)%%\s*$/)
    if (m) keys.push(m[1])
  }
  return keys
}

/* ---------- 主流程 ---------- */
;(async () => {
  // 1. 登录
  const loginRes = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: process.env.LMS_PASS }),
  }).then((r) => r.json())
  if (!loginRes.success) throw new Error('登录失败: ' + loginRes.msg)
  TOKEN = loginRes.data.token || loginRes.data.auth_token
  console.log('登录 OK')

  const sections = parseSections()
  const qmap = fs.existsSync(CHECKPOINT) ? JSON.parse(fs.readFileSync(CHECKPOINT, 'utf8')) : {}

  // 2. 幂等建题：以 md 标记为准，只建每章用到的题
  const defined = new Map(QUESTIONS.map((q) => [q.key, q]))
  const usedKeys = new Set()
  for (const c of CHAPTERS) {
    const md = sections[c.key]
    if (md === undefined) throw new Error(`章节 ${c.key} 缺少 markdown 内容`)
    for (const k of extractMarkers(md)) usedKeys.add(k)
  }
  const missing = [...usedKeys].filter((k) => !defined.has(k))
  if (missing.length) throw new Error('以下标记没有题目定义: ' + missing.join(', '))
  console.log(`共 ${usedKeys.size} 道题需要创建`)

  for (const key of usedKeys) {
    if (qmap[key]) { console.log(`${key} 已存在 cid=${qmap[key]}，跳过`); continue }
    const q = defined.get(key)
    const body = { course_id: COURSE_ID, name: `IBCS ${key}`, type: q.type, point: 5, tags: ['ibcs'] }
    body.content = q.content
    body.options = q.options
    body.answer = q.answer
    if (q.explanation) body.explanation = q.explanation
    const issues = validateContent(q.content)
    if (issues.length) throw new Error(`${key} 题目结构问题: ${issues.join('; ')}`)
    const s = JSON.stringify(q.content)
    if (q.type === 'fill' && !s.includes('"inputs"')) throw new Error(`${key} fill 缺 inputs 节点`)
    if (q.type === 'select' && !s.includes('"select"')) throw new Error(`${key} select 缺 select 节点`)
    const created = await api('/api/questions/add', 'POST', body)
    qmap[key] = created.cid
    console.log(`${key} 建题 OK cid=${created.cid} (${q.type})`)
    fs.writeFileSync(CHECKPOINT, JSON.stringify(qmap, null, 2))
  }

  // 3. 创建缺失章节（按名字幂等）
  const existing = await api(`/api/courses/show?id=${COURSE_ID}`)
  const byName = {}
  for (const ch of existing.chapters || []) byName[ch.title] = ch.id
  for (const c of CHAPTERS) {
    if (REUSE[c.key]) { c.id = REUSE[c.key]; continue }
    if (byName[c.name]) { c.id = byName[c.name]; console.log(`章节已存在: ${c.name} id=${c.id}`); continue }
    const created = await api('/api/chapters/add', 'POST', { name: c.name, courseId: COURSE_ID, isOpen: true })
    c.id = created[0].id
    console.log(`章节创建: ${c.name} id=${c.id}`)
  }

  // 4. orders 两级目录树 + 课程简介
  const orders = []
  let gOrder = 0
  let currentGroup = null
  for (const c of CHAPTERS) {
    if (c.group) {
      orders.push({ id: String(c.id), label: c.name, parentId: null, order: gOrder })
      currentGroup = String(c.id)
      gOrder++
    } else if (c.top) {
      orders.push({ id: String(c.id), label: c.name, parentId: null, order: gOrder })
      gOrder++
    } else {
      orders.push({ id: String(c.id), label: c.name, parentId: currentGroup, order: orders.filter((o) => o.parentId === currentGroup).length })
    }
  }
  await api('/api/courses/update', 'POST', {
    id: COURSE_ID,
    orders,
    content: [
      '## 🎓 IB Computer Science',
      '',
      'A complete course built on the **new IB Computer Science guide (first assessment 2026)** — every theme, every topic, with practice questions along the way.',
      '',
      '- 🧠 **Theme B first**: computational thinking, Python programming, OOP and (HL) abstract data types',
      '- 🖥️ **Then Theme A**: hardware, binary & logic, operating systems, networks, databases and machine learning',
      '- 📝 **Assessment ready**: Paper 1, Paper 2, the HL case study and the IA — with exam strategy throughout',
      '- ✅ **Learn by doing**: short explanations paired with varied interactive practice in every chapter',
      '',
      ':::callout icon=🎯',
      'SL and HL share the core. Chapters marked **(HL)** contain HL-only extensions — SL students can skim them for breadth.',
      ':::',
      '',
      '## 🚀 How to use this course',
      '',
      '- Follow the chapter order — each chapter ends with quick-check exercises',
      '- 💻 Type out every code example yourself; never copy-paste while learning',
      '- 🧪 When stuck, trace the code with a table — it works in class and in the exam',
      '',
      ':::callout icon=💡',
      'We use **Python** as the course language. The IB also allows Java — the concepts transfer directly.',
      ':::',
    ].join('\n'),
  })
  console.log('orders 目录树 + 课程简介已更新')

  // 5. 逐章填充
  let filled = 0
  for (const c of CHAPTERS) {
    let md = sections[c.key]
    const markers = extractMarkers(md)
    const hasMarkers = markers.length > 0
    await api('/api/chapters/update', 'POST', { id: c.id, name: c.name, content: md })
    if (!hasMarkers) { filled++; console.log(`✓ ${c.key} ${c.name} (无题)`); continue }

    const chRaw = await api(`/api/chapters/show?id=${c.id}`)
    const doc = (chRaw.chapter || chRaw).content
    let replaced = 0
    const walk = (nodes) => {
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]
        if (n.type === 'paragraph') {
          const text = (n.content || []).map((x) => x.text || '').join('').trim()
          const m = text.match(/^%%([A-Z0-9]+)%%$/)
          if (m && qmap[m[1]]) {
            nodes[i] = { type: 'vue', attrs: { type: 'question', height: null, content: String(qmap[m[1]]) } }
            replaced++
            continue
          }
        }
        if (Array.isArray(n.content)) walk(n.content)
      }
    }
    walk(doc.content)
    if (replaced !== markers.length) throw new Error(`${c.key} 标记替换 ${replaced}/${markers.length} 不符`)
    const issues = validateContent(doc)
    if (issues.length) throw new Error(`${c.key} 结构自检失败:\n` + issues.join('\n'))
    await api('/api/chapters/update', 'POST', { id: c.id, content: doc })
    filled++
    console.log(`✓ ${c.key} ${c.name} (${replaced} 题)`)
  }

  console.log(`\n✅ 完成：${filled}/${CHAPTERS.length} 章填充，题目 cid 映射:`, JSON.stringify(qmap))
  const first = CHAPTERS.find((c) => !c.group)
  console.log(`预览: ${BASE}/course/${COURSE_ID}/${first.id}`)
})().catch((e) => {
  console.error('❌ 失败:', e.message)
  process.exit(1)
})
