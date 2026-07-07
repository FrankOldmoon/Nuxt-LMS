### 通用字段说明

所有题型均包含以下统一顶层字段，可作为生成基础模板：

| 字段          | 类型            | 说明                            |
| ------------- | --------------- | ------------------------------- |
| `name`        | string          | 题目编号/名称                   |
| `content`     | string / object | 题干内容，支持markdown文本      |
| `options`     | array / object  | 选项/配置，不同题型结构差异较大 |
| `answer`      | array           | 标准答案，格式随题型变化        |
| `point`       | number          | 题目分值                        |
| `type`        | string          | 题型唯一标识                    |
| `tags`        | array           | 题目标签，用于分类筛选          |
| `extra`       | null / any      | 扩展字段，通常为 `null`         |
| `explanation` | string / object | 答案解析，支持markdown文本      |

---

## 各题型详解与生成提示词

### 1. 单选题 `type: "single"`

**结构说明**：从多个选项中选出唯一正确答案，答案为正确选项的下标索引。

- `content`：字符串，纯文本题干
- `options`：字符串数组，每个元素为一个选项
- `answer`：数字数组，仅含 1 个元素，为正确选项的下标（从 0 开始）

**典型示例**

```json
{
  "name": "Q1",
  "content": "Which one is the full name of AI?",
  "options": ["Automatic Information", "Artificial Intelligence", "Advanced Internet", "Application Interface"],
  "answer": [1],
  "point": 1,
  "type": "single",
  "tags": ["AI"],
  "extra": null,
  "explanation": ""
}
生成提示词
生成一道单选题，输出为标准 JSON 对象。题干为【此处替换题目内容】，选项共 4 个，只有 1 个正确答案。answer 字段用数组包裹正确选项的索引下标（从 0 开始），type 固定为 "single"，包含完整的通用字段。

---
2. 判断题 type: "judge"
结构说明：判断题干描述是否正确，固定两个选项。
- content：字符串或富文本 Doc 结构，题干可包含代码、段落等
- options：长度为 2 的字符串数组，通常为 ["✓ Correct", "✗ Wrong"]
- answer：数字数组，[0] 表示正确，[1] 表示错误
典型示例
{
  "name": "Q3",
  "content": "AI can only work on computers and cannot be used on mobile phones.",
  "options": ["✓ Correct", "✗ Wrong"],
  "answer": [1],
  "point": 1,
  "type": "judge",
  "tags": ["AI"],
  "extra": null,
  "explanation": ""
}
生成提示词
生成一道判断题，输出为标准 JSON 对象。题干为【此处替换题目内容】，选项固定为 ["✓ Correct", "✗ Wrong"]。answer 为数组：正确填 [0]，错误填 [1]，type 固定为 "judge"，包含完整通用字段。

---
3. 多选题 type: "multiple"
结构说明：存在多个正确选项，答案为所有正确选项的下标数组。
- content：字符串，纯文本题干
- options：字符串数组，选项列表
- answer：数字数组，包含所有正确选项的下标
典型示例
{
  "name": "Q2",
  "content": "Which of the following fields belong to the application areas of AI?",
  "options": ["Face recognition", "Machine translation", "Manual handwriting copying", "Autonomous driving"],
  "answer": [0, 1, 3],
  "point": 1,
  "type": "multiple",
  "tags": ["AI"],
  "extra": null,
  "explanation": ""
}
生成提示词
生成一道多选题，输出为标准 JSON 对象。题干为【此处替换题目内容】，选项共 4 个，包含 2~3 个正确答案。answer 为数组，填入所有正确选项的索引下标，type 固定为 "multiple"，分值可设为 2 分，包含完整通用字段。

---
4. 选词填空题 type: "select"
结构说明：题干中有多处挖空，从给定词库中选择对应词汇填入。
- content：字符串，挖空位置用 ||占位符名称|| 标记
- options：字符串数组，所有候选词汇
- answer：字符串数组，按挖空从左到右的顺序排列正确答案
典型示例
{
  "name": "Q5",
  "content": "In the history of AI, Alan Turing put forward the ||Turing Test|| in 1950, and the ||Dartmouth Workshop|| held in 1956 officially named the term \"Artificial Intelligence\".",
  "options": ["Turing Test", "Dartmouth Workshop", "Neural Network", "Expert System"],
  "answer": ["Turing Test", "Dartmouth Workshop"],
  "point": 1,
  "type": "select",
  "tags": [],
  "extra": null,
  "explanation": ""
}
生成提示词
生成一道选词填空题，输出为标准 JSON 对象。题干为【此处替换内容】，挖空处用 ||关键词|| 标记，共 N 个空。options 给出所有候选词（包含干扰项），answer 为字符串数组，按挖空顺序填入正确词汇，type 固定为 "select"，包含完整通用字段。

---
5. 排序题 type: "sort"
结构说明：将给定条目按指定规则（时间、逻辑等）排列。
- content：字符串，说明排序要求
- options：字符串数组，待排序的所有条目
- answer：数字数组，元素为选项下标，按正确顺序排列
典型示例
{
  "name": "Q8",
  "content": "Put the following AI historical events in the correct chronological order from earliest to latest.",
  "options": [
    "Alan Turing published the paper about Turing Test",
    "Dartmouth Workshop officially proposed the term \"AI\"",
    "The first simple neural network model was created",
    "AlphaGo defeated top human Go player Lee Sedol"
  ],
  "answer": [0, 1, 2, 3],
  "point": 1,
  "type": "sort",
  "tags": [],
  "extra": null,
  "explanation": ""
}
生成提示词
生成一道排序题，输出为标准 JSON 对象。题干要求【按 XX 规则排序】，options 列出 4 个待排序条目。answer 为数字数组，按正确顺序填入每个条目的索引下标，type 固定为 "sort"，包含完整通用字段。

---
6. 分类题 type: "classify"
结构说明：将多个条目划分到指定类别中。
- content：字符串，说明分类要求
- options：对象数组，每个对象含 name（类别名）和 items（该类别下的条目数组）
- answer：数字数组，长度等于所有条目总数；按「类别顺序 + 类别内条目顺序」拼接所有条目，标注每个条目所属的类别下标（0、1...）
典型示例
{
  "name": "Q9",
  "content": "Classify the following learning tasks into Supervised Learning and Unsupervised Learning.",
  "options": [
    {
      "name": "Supervised Learning",
      "items": [
        "Predict house prices based on given housing data and price labels",
        "Recognize cats and dogs from labeled picture datasets",
        "Predict students’ exam scores with known historical score records"
      ]
    },
    {
      "name": "Unsupervised Learning",
      "items": [
        "Group customers with similar shopping habits without pre-set labels",
        "Divide a batch of articles into different topic groups"
      ]
    }
  ],
  "answer": [0, 0, 0, 1, 1],
  "point": 1,
  "type": "classify",
  "tags": [],
  "extra": null,
  "explanation": ""
}
生成提示词
生成一道分类题，输出为标准 JSON 对象。设置 2 个分类，每个分类下包含 2~3 个条目。options 按 [{name, items[]}, ...] 格式书写；answer 为数字数组，按所有条目的拼接顺序，依次填入每个条目所属的分类索引（从 0 开始），type 固定为 "classify"，包含完整通用字段。

---
7. 配对题 type: "match"
结构说明：将左侧概念与右侧描述 / 应用一一对应。
- content：字符串，题干说明
- options：对象数组，每个对象含 left（左侧项）和 right（右侧项）
- answer：数字数组，索引对应左侧项的顺序，值为对应右侧项的索引
典型示例
{
  "name": "Q10",
  "content": "Match each AI technology with its correct typical application.",
  "options": [
    {"left": "Computer Vision", "right": "Self-driving car visual detection"},
    {"left": "Natural Language Processing (NLP)", "right": "Chatbots and machine translation"},
    {"left": "Reinforcement Learning", "right": "Game AI like AlphaGo"},
    {"left": "Speech Recognition", "right": "Voice-to-text input"}
  ],
  "answer": [0, 1, 2, 3],
  "point": 1,
  "type": "match",
  "tags": [],
  "extra": null,
  "explanation": ""
}
生成提示词
生成一道配对题，输出为标准 JSON 对象。左侧为 4 个概念，右侧为 4 个对应描述，顺序打乱。options 按 [{left, right}, ...] 格式书写；answer 为数字数组，第 i 位表示第 i 个左侧项对应的右侧项索引，type 固定为 "match"，包含完整通用字段。

---
8. 填空题 type: "fill"
结构说明：题干中挖空，直接填写答案。支持两种题干形式：
纯文本：挖空用 {{占位符}} 标记
- options：空字符串数组，长度等于空的数量
- answer：字符串数组，按挖空顺序排列正确答案
典型示例
{
  "name": "Q4",
  "content": "The three core elements of AI are {{data}}, computing power and algorithms.",
  "options": [""],
  "answer": ["data"],
  "point": 1,
  "type": "fill",
  "tags": [],
  "extra": null,
  "explanation": ""
}
生成提示词
生成一道填空题，输出为标准 JSON 对象。题干中用 {{关键词}} 标记挖空位置，共 N 个空。options 为长度 N 的空字符串数组，answer 为字符串数组，按顺序填入每个空的正确答案，type 固定为 "fill"，包含完整通用字段。

---
9. 简答题 type: "short-answer"
结构说明：开放作答，通过正则表达式自动匹配判分。
- content：字符串，题干问题
- options：空数组 []
- answer：字符串数组，元素为匹配答案的正则表达式
典型示例
{
  "name": "Q11",
  "content": "What are the three core elements of artificial intelligence?",
  "options": [],
  "answer": ["^(?=[\\s\\S]*\\b[dD]ata\\b)(?=[\\s\\S]*\\b[cC]omputing [pP]ower\\b)(?=[\\s\\S]*\\b[aA]lgorithms\\b)[\\s\\S]*"],
  "point": 1,
  "type": "short-answer",
  "tags": [],
  "extra": null,
  "explanation": ""
}
生成提示词
生成一道简答题，输出为标准 JSON 对象。题干为【问题内容】，options 为空数组。answer 为数组，写入一条正则表达式，要求能匹配包含核心关键词的用户输入（支持大小写不敏感、多关键词同时匹配），type 固定为 "short-answer"，包含完整通用字段。

---
10. 拼图题 type: "puzzle"
结构说明：图片切分拼图题，复原切分后的图片块。
- content：通常为空字符串
- options：对象，包含 url（图片路径）和 split（切分阶数，如 4 表示 4×4=16 块）
- answer：数字数组，0 到 split²-1 的顺序数字，代表正确拼接顺序
典型示例
{
  "name": "Q11",
  "content": "",
  "options": {"url": "/api/file?pathname=2026-07-02%2F3.png", "split": 4},
  "answer": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  "point": 1,
  "type": "puzzle",
  "tags": [],
  "extra": null,
  "explanation": ""
}
生成提示词
生成一道拼图题，输出为标准 JSON 对象。options 为对象，包含图片 url 和切分数 split（例如 3 表示 3×3）。answer 为从 0 开始的连续数字数组，长度等于 split*split，代表正确顺序，type 固定为 "puzzle"，包含完整通用字段。

---
11. HTML 交互题 type: "html"
结构说明：完整可运行的 HTML 页面作为题目，自带交互逻辑与判分能力。
- content：完整 HTML 代码字符串，包含 HTML/CSS/JS，通过 parent.postMessage 向父页面回传正确率, 0~1之间
- options：空数组 []
- answer：数组，通常为 [1]，具体判分由 HTML 内部逻辑实现
生成提示词
生成一道 HTML 交互题，输出为标准 JSON 对象。content 为完整可运行的 HTML 代码字符串，实现【具体交互功能，如翻牌配对、拖拽等】，内部通过 parent.postMessage({ type: 'correct_rate', rate: 正确率 }, '*') 回传得分。options 为空数组，answer 为 [1]，type 固定为 "html"，包含完整通用字段。

---

```
