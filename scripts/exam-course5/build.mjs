/**
 * 组卷：course 5（ICT - Computer Vision）期中综合测评
 *
 * 规格（Frank 要求）：
 *   30 单选 + 10 多选 + 10 填空
 *   AI 理论 50% / Python 语法 50%
 *
 * 分配：
 *   单选 30 = AI 15 + Python 15
 *   多选 10 = AI 5  + Python 5
 *   填空 10 = AI 5  + Python 5
 *
 * 分值：单选 2×30 = 60，多选 3×10 = 30，填空 1×10 = 10 → 满分 100
 *
 * AI 理论的题直接取自 LMS course 5 的题库（cid 见 from 字段），
 * 只有 1 道单选是补写的（题库里单选只有 14 道）。
 * Python 语法题按课程实际教过的语法点新写：
 *   input() / int(input()) / print() / f-string / 算术运算符 / if-elif-else /
 *   for + range() / while / 列表 / import（cv2、PIL）
 *
 * 输出：exam.json（SurveyKing 的 ProjectRequest，mode=exam）
 */
import { readFileSync, writeFileSync } from 'node:fs'

const QUESTIONS = JSON.parse(
  readFileSync(new URL('./course5-questions.json', import.meta.url), 'utf8'),
)

/** 递归提取 tiptap doc 的纯文本 */
function textOf(v) {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (Array.isArray(v)) return v.map(textOf).join('')
  if (typeof v === 'object') {
    if (v.type === 'text') return v.text || ''
    if (v.type === 'inputs') return '____'
    if (v.type === 'hardBreak') return '\n'
    return textOf(v.content)
  }
  return String(v)
}

/** 从导出库里取题：单选/多选带选项文本与答案索引 */
function pick(cid) {
  const q = QUESTIONS.find((r) => r.cid === cid)
  if (!q) throw new Error(`题库里没有 cid=${cid}`)
  return {
    cid,
    stem: textOf(q.content).replace(/\s+/g, ' ').trim(),
    options: (q.options || []).map((o) => textOf(o).trim()),
    answer: q.answer || [],
  }
}

// ---------------------------------------------------------------- AI 理论 · 单选 15
const AI_SINGLE_CIDS = [11, 12, 13, 43, 49, 63, 68, 85, 92, 102, 112, 121, 133, 139]

// ---------------------------------------------------------------- AI 理论 · 多选 5
const AI_MULTI_CIDS = [44, 50, 64, 86, 140]

// ---------------------------------------------------------------- AI 理论 · 填空 5
const AI_FILL_CIDS = [45, 90, 97, 117, 144]

// ---------------------------------------------------------------- Python 语法 · 单选 15（新写）
const PY_SINGLE = [
  {
    stem: 'Which statement displays text or a value on the screen in Python?',
    options: ['input()', 'print()', 'read()', 'show()'],
    answer: [1],
    note: 'print() 输出',
  },
  {
    stem: 'Which function reads what the user types on the keyboard?',
    options: ['print()', 'input()', 'get()', 'scan()'],
    answer: [1],
    note: 'input() 输入',
  },
  {
    stem: 'What data type does input() always return?',
    options: ['int', 'float', 'str', 'bool'],
    answer: [2],
    note: 'input() 永远返回字符串',
  },
  {
    stem: 'The user types 25. Which line converts it into a whole number so you can do maths with it?',
    options: ['n = input()', 'n = str(input())', 'n = int(input())', 'n = float(input()) / 2'],
    answer: [2],
    note: 'int() 类型转换',
  },
  {
    stem: 'What is printed by this code?\n\na = 2\nb = 3\nprint(a + b)',
    options: ['23', '5', 'a + b', 'An error'],
    answer: [1],
    note: '数字相加',
  },
  {
    stem: 'What is printed by this code?\n\na = "2"\nb = "3"\nprint(a + b)',
    options: ['5', '23', '2 + 3', 'An error'],
    answer: [1],
    note: '字符串拼接（与上一题对照）',
  },
  {
    stem: 'What is the value of result?\n\nresult = 7 // 2',
    options: ['3', '3.5', '4', '1'],
    answer: [0],
    note: '整除 //',
  },
  {
    stem: 'What is the value of result?\n\nresult = 7 % 2',
    options: ['0', '1', '2', '3.5'],
    answer: [1],
    note: '取余 %',
  },
  {
    stem: 'How many numbers does the screen show, and which ones?\n\nfor i in range(3):\n    print(i)',
    options: ['1 2 3', '0 1 2', '0 1 2 3', '3'],
    answer: [1],
    note: 'range(3) → 0..2',
  },
  {
    stem: 'Which numbers does range(1, 4) produce?',
    options: ['1 2 3 4', '1 2 3', '0 1 2 3', '2 3 4'],
    answer: [1],
    note: 'range 左闭右开',
  },
  {
    stem: 'Which line correctly checks whether score is greater than or equal to 60?',
    options: ['if score = 60:', 'if score => 60:', 'if score >= 60:', 'if (score >= 60) then:'],
    answer: [2],
    note: '比较运算符',
  },
  {
    stem: 'A while loop keeps repeating until…',
    options: [
      'the program ends',
      'its condition becomes False',
      'the body has run once',
      'the screen is full',
    ],
    answer: [1],
    note: 'while 循环条件',
  },
  {
    stem: 'What does this line do?\n\nprint(f"Average: {total / 3:.2f}")',
    options: [
      'Prints the value rounded to 2 decimal places',
      'Prints the text exactly as written',
      'Prints only the integer part',
      'Raises an error',
    ],
    answer: [0],
    note: 'f-string 格式化为 2 位小数',
  },
  {
    stem: 'Which line correctly brings the OpenCV library into your program?',
    options: ['include cv2', 'import cv2', 'using cv2', '#import cv2'],
    answer: [1],
    note: 'import 导入库',
  },
  {
    stem: 'What is the value of second?\n\npixels = [12, 45, 7, 30]\nsecond = pixels[1]',
    options: ['12', '45', '7', '30'],
    answer: [1],
    note: '列表从 0 开始索引',
  },
]

// ---------------------------------------------------------------- Python 语法 · 多选 5（新写）
const PY_MULTI = [
  {
    stem: 'Which of these are valid Python data types? (Choose all that apply)',
    options: ['int', 'str', 'float', 'list', 'paragraph'],
    answer: [0, 1, 2, 3],
    note: '基本类型',
  },
  {
    stem: 'Which of these are Python built-in functions that we used in this course? (Choose all that apply)',
    options: ['print', 'input', 'int', 'range', 'scan'],
    answer: [0, 1, 2, 3],
    note: '内置函数',
  },
  {
    stem: 'Which statements about input() are true? (Choose all that apply)',
    options: [
      'It always returns a string',
      'You need int() to use the value as a number',
      'You can pass a prompt message, e.g. input("Age: ")',
      'It returns a number automatically when you type digits',
    ],
    answer: [0, 1, 2],
    note: 'input 返回字符串，需要转换',
  },
  {
    stem: 'Which statements about range() are true? (Choose all that apply)',
    options: [
      'range(5) produces 0, 1, 2, 3, 4',
      'range(1, 6) produces 1, 2, 3, 4, 5',
      'range(0, 10, 2) produces 0, 2, 4, 6, 8',
      'range(5) produces 1, 2, 3, 4, 5',
    ],
    answer: [0, 1, 2],
    note: 'range 的三种用法',
  },
  {
    stem: 'Which lines correctly import a library? (Choose all that apply)',
    options: [
      'import cv2',
      'from PIL import Image',
      'import numpy as np',
      'include cv2',
    ],
    answer: [0, 1, 2],
    note: 'import 三种写法',
  },
]

// ---------------------------------------------------------------- Python 语法 · 填空 5（新写）
const PY_FILL = [
  {
    stem: 'Fill in the blank so the program reads the name typed by the user.\n\nname = ______("Your name: ")',
    answer: 'input',
    note: 'input()',
  },
  {
    stem: 'Fill in the blank so age becomes a whole number that can be used in maths.\n\nage = ______(input("Age: "))',
    answer: 'int',
    note: 'int()',
  },
  {
    stem: 'Fill in the blank to repeat the block 5 times.\n\n______ i in range(5):\n    print(i)',
    answer: 'for',
    note: 'for 循环',
  },
  {
    stem: 'Fill in the blank to give the library a short name.\n\nimport numpy ______ np',
    answer: 'as',
    note: 'import ... as ...',
  },
  {
    stem: 'Fill in the blank so the average is printed with exactly 2 decimal places.\n\nprint(f"Average: {average:______}")',
    answer: '.2f',
    note: 'f-string 格式说明符',
  },
]

// ---------------------------------------------------------------- 组装
//
// Schema 结构（照 AnswerScoreEvaluator 的要求来，否则能存进去但判分是 0 分）：
//   单选/多选：examScore 在**题目**节点；正确答案标记在**选项**节点的
//              attribute.examCorrectAnswer（非 null 即正确）
//   填空：    每个"空"是一个 Option 子节点，答案文本 + 分值与落在**子节点**上
//              （SelectCorrectEvaluator 求和用的是 option.examScore）
//              题目节点用 examAnswerMode=selectCorrect + examMatchRule
function uid(prefix, n) {
  return `${prefix}${String(n).padStart(3, '0')}`
}

/** 单选 / 多选 */
function choiceNode(kind, idx, q, score) {
  const qid = uid('q', idx)
  const correct = new Set(q.answer)
  return {
    id: qid,
    type: kind, // Radio | Checkbox
    title: q.stem,
    attribute: {
      required: true,
      examScore: score,
      examAnswerMode: kind === 'Radio' ? 'onlyOne' : 'selectAll',
      ...(q.note ? { examAnalysis: q.note } : {}),
    },
    children: q.options.map((opt, i) => ({
      id: `${qid}_o${i + 1}`,
      type: 'Option',
      title: `${String.fromCharCode(65 + i)}. ${opt}`,
      attribute: correct.has(i) ? { examCorrectAnswer: 'true' } : {},
    })),
  }
}

/** 填空（单个空 → 一个 Option 子节点） */
function fillNode(idx, q, score) {
  const qid = uid('q', idx)
  return {
    id: qid,
    type: 'FillBlank',
    title: q.stem,
    attribute: {
      required: true,
      // 题目上必须有 examScore：SelectCorrectEvaluator.support() 会检查它非 null，
      // 为 null 就直接落到 DefaultEvaluator → 永远 0 分。
      // 真正求和用的是子节点（空）上的 examScore。
      examScore: score,
      examAnswerMode: 'selectCorrect', // 让 SelectCorrectEvaluator 比对文本
      examMatchRule: 'completeSame',
      content: q.stem,
      ...(q.note ? { examAnalysis: q.note } : {}),
    },
    children: [
      {
        id: `${qid}_b1`,
        type: 'Option',
        title: '',
        // 每个空的分值与答案都在这
        attribute: { examScore: score, examCorrectAnswer: q.answer },
      },
    ],
  }
}

const children = []
let n = 1
const T = { aiSingle: [], pySingle: [], aiMulti: [], pyMulti: [], aiFill: [], pyFill: [] }

// AI 单选：题库 14 道 + 补 1 道
for (const cid of AI_SINGLE_CIDS) T.aiSingle.push(pick(cid))
T.aiSingle.push({
  stem: 'What does "training" mean in image classification?',
  options: [
    'Letting the model learn patterns from many labelled examples',
    'Typing the answer for every new photo by hand',
    'Taking photos with a better camera',
    'Turning the computer off and on again',
  ],
  answer: [0],
  note: '训练 = 从大量标注样本中学习特征',
})
T.pySingle = PY_SINGLE
T.aiMulti = AI_MULTI_CIDS.map(pick)
T.pyMulti = PY_MULTI
T.aiFill = AI_FILL_CIDS.map((cid) => {
  const q = pick(cid)
  return { stem: q.stem, answer: (q.answer || [''])[0], note: '' }
})
T.pyFill = PY_FILL

// 顺序：单选 30 → 多选 10 → 填空 10
for (const q of T.aiSingle) children.push(choiceNode('Radio', n++, q, 2))
for (const q of T.pySingle) children.push(choiceNode('Radio', n++, q, 2))
children.push({ id: 'sec_multi', type: 'Remark', title: 'Part B — Multiple choice (3 points each)' })
for (const q of T.aiMulti) children.push(choiceNode('Checkbox', n++, q, 3))
for (const q of T.pyMulti) children.push(choiceNode('Checkbox', n++, q, 3))
children.push({ id: 'sec_fill', type: 'Remark', title: 'Part C — Fill in the blanks (1 point each)' })
for (const q of T.aiFill) children.push(fillNode(n++, q, 1))
for (const q of T.pyFill) children.push(fillNode(n++, q, 1))

const exam = {
  name: 'ICT - Computer Vision 综合测评（AI 理论 + Python 语法）',
  mode: 'exam',
  status: 1,
  survey: {
    id: 'survey_root',
    type: 'Survey',
    title: 'ICT - Computer Vision — Comprehensive Test',
    description:
      'Part A: 30 single-choice (2 pts each) · Part B: 10 multiple-choice (3 pts each) · Part C: 10 fill-in-the-blank (1 pt each). Total 100 points. AI theory 50% / Python syntax 50%.',
    children,
  },
}

writeFileSync(new URL('./exam.json', import.meta.url), JSON.stringify(exam, null, 2))

// 自检
const counts = children.reduce((acc, c) => {
  acc[c.type] = (acc[c.type] || 0) + 1
  return acc
}, {})
// 填空题的分值在"空"子节点上（判分器按 option 求和），其余在题目上
const scoreOf = (c) =>
  c.type === 'FillBlank' ? c.children?.[0]?.attribute?.examScore || 0 : c.attribute?.examScore || 0
const total = children.reduce((s, c) => s + scoreOf(c), 0)
console.log('题目构成:', counts)
console.log('AI 理论:', T.aiSingle.length + T.aiMulti.length + T.aiFill.length, '道')
console.log('Python 语法:', T.pySingle.length + T.pyMulti.length + T.pyFill.length, '道')
console.log('总分:', total)
if (total !== 100) console.warn('⚠️ 总分不是 100')

// 结构自检：每道选择题必须恰好标出正确答案，填空题必须有 1 个空且答案非空
let struct = 0
for (const c of children) {
  if (c.type === 'Radio' || c.type === 'Checkbox') {
    const marked = (c.children || []).filter((o) => o.attribute?.examCorrectAnswer != null)
    if (!marked.length) { console.warn(`⚠️ ${c.id} 没有标记正确选项`); struct++ }
    if (c.type === 'Radio' && marked.length !== 1) { console.warn(`⚠️ ${c.id} 单选标了 ${marked.length} 个正确选项`); struct++ }
  }
  if (c.type === 'FillBlank') {
    const blank = c.children?.[0]
    if (!blank?.attribute?.examCorrectAnswer) { console.warn(`⚠️ ${c.id} 填空缺答案`); struct++ }
    if (!blank?.attribute?.examScore) { console.warn(`⚠️ ${c.id} 填空缺分值`); struct++ }
  }
}
console.log(struct ? `结构问题 ${struct} 处` : '结构自检通过 ✓')
