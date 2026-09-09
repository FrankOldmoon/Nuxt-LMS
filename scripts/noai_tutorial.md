%%%%% G01
## 🏆 认识 NOAI

**NOAI（全国人工智能奥林匹克）** 是中国区选拔**国际人工智能奥林匹克（IOAI）**选手的官方通道 —— AI 领域的"IMO"。🥇

这一组先搞清楚三件事：**考什么、怎么考、AI 从哪来**。知己知彼，备考不慌。

%%GQ1%%

%%%%% N01
## 🎯 NOAI 是什么？

NOAI 面向 **9–12 年级**在校中学生，**唯一指定语言是 Python** 🐍。它和 NOI 不同：NOI 考算法与数据结构用 C++；NOAI 考**数据科学与 AI 算法**，用 Python。

### 🗺️ 赛事路线图

1. ✍️ **第一轮：水平测试（初赛）** — 全国认证评估中心**线下纸笔考**，120 分钟，满分 100 分
2. 💻 **第二轮：NOAI 中国站** — 水平测试 **Top 200** 晋级，**上机实验** 6 小时，用 sklearn / PyTorch 解决真实 AI 问题
3. 🌍 **IOAI 国际站** — 中国派出 **2 支队伍共 8 人**，与 50+ 国家和地区同场竞技

### 🏅 荣誉设置

| 奖项 | 比例 |
| --- | --- |
| High Distinction 一等奖 | 前 10% |
| Distinction 二等奖 | 前 10%–30% |
| Merit 三等奖 | 前 30%–50% |
| Participation 参与奖 | 其余 50% |

:::callout icon=💡
所有参与者都有电子证书 —— 认真备赛，前 50% 就有奖拿！
:::

%%NQ1%%

%%NQ2%%

%%%%% N02
## 📋 考纲拆解与备考路线

### 🔬 水平测试考什么？

三大板块（官方学术大纲）：

- 🐍 **Python 编程基础** — 变量、控制流、函数、列表字典、字符串
- 🧱 **基础数据结构** — 栈、队列、哈希表、树、图、排序与查找
- 🤖 **人工智能基本概念与算法** — 机器学习概念、经典算法、神经网络初步、AI 伦理

### 📝 题型与分值

- ✅ **单项选择题**（约 30 分）— 概念理解 + 手算（如 softmax、KNN 距离）
- 📖 **概念解释题**（约 20 分）— 用自己的话解释术语并举例
- 💻 **Python 编程题** — 手写代码（纸笔考，不实际上机！）
- 🧩 **AI 问题解决** — 综合应用

:::callout icon=⚠️
纸笔考意味着**没有自动补全、不能运行验证** —— 平时练习就要练"在纸上写对代码"的能力。
:::

### 🗓️ 备考路线

Python 基础 → 数据结构 → 机器学习概念 → 经典算法 → 真题演练，正好是本课程的章节顺序。

%%NQ3%%

%%NQ4%%

%%%%% N03
## 🏛️ AI 发展史与三大学派

选择题爱考 AI 的"家谱" —— 三大学派你必须张口就来：

- 🔣 **符号主义** — 智能来自**逻辑推理与符号运算**，代表：专家系统、知识图谱
- 🧠 **连接主义** — 智能来自**神经元的连接**，代表：神经网络、深度学习
- 🤖 **行为主义** — 智能来自**与环境的交互**，代表：强化学习、机器人控制

### ⏳ 关键里程碑

- 1950 🧪 图灵提出**图灵测试**
- 1956 🎂 **达特茅斯会议**，"人工智能"一词诞生
- 2012 📸 **AlexNet** 深度学习引爆计算机视觉
- 2017 ⚡ **Transformer** 架构提出（论文标题就是《Attention Is All You Need》）
- 2022 💬 大语言模型（LLM）走进大众生活

:::callout icon=💡
考试技巧：题目描述"专家系统、if-else 推理"→ 符号主义；"模拟大脑神经元"→ 连接主义；"试错、奖励"→ 行为主义。
:::

%%NQ5%%

%%NQ6%%

%%%%% G02
## 🐍 Python 编程基础

初赛的编程题**手写 Python** —— 语法必须准到不用查。🐍

这一组把考试要用的 Python 核心过一遍：语法、函数、列表字典、字符串文件。

%%GQ2%%

%%%%% N04
## ⌨️ Python 语法速览

### 📦 变量与类型

```python
n = 10            # int
x = 3.14          # float
s = "NOAI"        # str
ok = True         # bool
n = int(input())  # input() 永远返回 str，要手动转换！
```

### 🔀 控制流

```python
if score >= 90:
    print("优")
elif score >= 60:
    print("及格")
else:
    print("加油")

for i in range(5):        # 0 1 2 3 4
    print(i)

while n > 0:              # 条件循环
    n -= 1
```

:::callout icon=⚠️
纸笔考常见扣分点：缩进错误、`=` 与 `==` 混用、`range(1, n)` 丢掉 n。写完在心里"运行"一遍。
:::

%%NQ7%%

%%NQ8%%

%%%%% N05
## 🧰 函数与常用模块

### ✍️ 定义函数

```python
def average(scores):
    """返回平均分"""
    return sum(scores) / len(scores)

print(average([80, 90, 100]))  # 90.0
```

- 📥 参数在括号里，📤 结果用 `return` 送回
- 没写 `return` 的函数返回 `None`

### 📦 考场常用模块

```python
import math          # sqrt, ceil, floor, pi
import random        # random(), randint(a,b), shuffle(list)
import collections   # Counter, deque —— 数据结构题神器！
import heapq         # 堆 / 优先队列
import itertools     # 排列组合 permutations, combinations
```

:::callout icon=💡
`collections.Counter` 一行统计词频；`deque` 秒变队列/栈。初赛编程题里它们能省下十行代码。
:::

%%NQ9%%

%%NQ10%%

%%%%% N06
## 📋 列表与字典进阶

### 🔧 列表操作

```python
a = [3, 1, 4, 1, 5]
a.sort()                 # 原地排序 [1, 1, 3, 4, 5]
b = sorted(a, reverse=True)  # 新列表，降序
a.append(9)              # 尾部追加
a.pop()                  # 弹出末尾
```

### 🧺 推导式（考试高频！）

```python
squares = [x * x for x in range(10)]
evens = [x for x in range(20) if x % 2 == 0]
matrix = [[0] * 5 for _ in range(3)]   # 3 行 5 列的二维列表
```

### 🗂️ 字典

```python
count = {}
for ch in "abracadabra":
    count[ch] = count.get(ch, 0) + 1   # 手写词频统计

from collections import Counter
print(Counter("abracadabra"))          # 一行搞定
```

%%NQ11%%

%%NQ12%%

%%%%% N07
## 📄 字符串与文件

### 🔤 字符串处理（NLP 题的地基）

```python
s = "Hello NOAI"
s.lower()               # 全小写
s.split()               # ['Hello', 'NOAI']
"-".join(["a", "b"])    # 'a-b'
s[::-1]                 # 反转
ord("A"), chr(65)       # 65, 'A' —— 字符与编码互转
```

### 📁 文件读写

```python
with open("data.txt", "r", encoding="utf-8") as f:
    lines = f.readlines()          # 每行一个元素（含 \n）

with open("out.txt", "w", encoding="utf-8") as f:
    f.write("结果\n")
```

:::callout icon=⚠️
处理中文文件**必须写 `encoding="utf-8"`**，否则 Windows 上可能乱码报错。
:::

%%NQ13%%

%%NQ14%%

%%%%% G03
## 🧱 基础数据结构

数据结构是"组织数据的方式" —— 选对结构，算法就成功了一半。🧱

NOAI 水平测试必考：**栈、队列、哈希表、树、图**，以及排序查找。

%%GQ3%%

%%%%% N08
## 🥞 栈、队列与链表

### 🥞 栈 Stack — 后进先出 LIFO

```python
stack = []
stack.append(1)   # push
stack.append(2)
top = stack.pop() # 2 —— 弹出栈顶
```

应用：括号匹配、撤销操作、函数调用栈、深度优先搜索（DFS）。

### 🚶 队列 Queue — 先进先出 FIFO

```python
from collections import deque
queue = deque()
queue.append(1)     # 入队
queue.append(2)
front = queue.popleft()  # 1 —— 出队
```

应用：排队处理、广度优先搜索（BFS）、消息缓冲。

### 🔗 链表 Linked List

每个节点存 **数据 + 指向下一节点的指针**；插入删除快（O(1)），随机访问慢（O(n)）。

%%NQ15%%

%%NQ16%%

%%%%% N09
## 🗝️ 哈希表

**哈希表（Hash Table）** 通过哈希函数把键映射到存储位置，实现**平均 O(1) 的查找、插入、删除**。Python 的 `dict` 和 `set` 底层就是它。⚡

```python
seen = set()
if target - x in seen:      # O(1) 判断
    print("找到了！")
seen.add(x)

# 经典应用：两数之和
def two_sum(nums, target):
    seen = {}
    for i, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], i]
        seen[x] = i
```

:::callout icon=💡
哈希表是"用空间换时间"的典范：遇到"查找是否存在 / 统计出现次数 / 判断重复"先想它。NOAI 2025 复赛真题就考过哈希表应用。
:::

**哈希冲突**：两个键映射到同一位置 —— 常用**链地址法**（同位置挂链表）或**开放寻址法**（往后找空位）解决。

%%NQ17%%

%%NQ18%%

%%%%% N10
## 🌲 树与图、BFS 与 DFS

### 🌲 树与二叉树

二叉树每个节点最多两个孩子。**二叉搜索树（BST）**：左子树 < 根 < 右子树，中序遍历得到有序序列。

### 🕸️ 图的遍历 —— 两大神器

| | BFS 广度优先 | DFS 深度优先 |
| --- | --- | --- |
| 数据结构 | 队列 🚶 | 栈 / 递归 🥞 |
| 特点 | 一层层扩展 | 一条路走到黑再回头 |
| 求最短步数 | ✅ 首选 | ❌ 不保证 |

```python
from collections import deque
def bfs(graph, start):
    visited, q = {start}, deque([start])
    while q:
        node = q.popleft()
        for nxt in graph[node]:
            if nxt not in visited:
                visited.add(nxt)
                q.append(nxt)
```

%%NQ19%%

%%NQ20%%

%%%%% N11
## 🔃 排序与查找

### 🔃 排序算法对比

| 算法 | 时间复杂度 | 要点 |
| --- | --- | --- |
| 冒泡排序 | O(n²) | 相邻比较交换，每轮冒出最大值 |
| 选择排序 | O(n²) | 每轮选出最小值放前面 |
| 归并排序 | O(n log n) | 分治：拆半 + 合并 |
| 快速排序 | 平均 O(n log n) | 选基准分区 |
| Python `sort()` | O(n log n) | Timsort，考场直接用 ✅ |

### 🔍 二分查找 — O(log n)

前提：**有序**！每次比较把范围砍半，100 万数据最多 20 次。

```python
lo, hi = 0, len(a) - 1
while lo <= hi:
    mid = (lo + hi) // 2
    if a[mid] == target:
        print("找到了", mid)
        break
    elif a[mid] < target:
        lo = mid + 1
    else:
        hi = mid - 1
```

%%NQ21%%

%%NQ22%%

%%%%% G04
## 🤖 人工智能基本概念

进入 NOAI 的核心考区：**机器学习的世界观**。🤖

概念解释题（20 分）就出自这里 —— 每个术语都要能"解释 + 举例"。

%%GQ4%%

%%%%% N12
## 🎓 什么是机器学习？

**机器学习**：让计算机从**数据**中自动学习规律，而不用人类写出明确规则。

> 传统编程：规则 + 数据 → 答案
> 机器学习：数据 + 答案 → 规则（模型）

### 🎓 三大学习范式

- 🏷️ **监督学习** — 有标注数据（输入→正确答案），任务：分类（离散标签）、回归（连续数值）
- 🧩 **无监督学习** — 无标注，自己发现结构：聚类、降维
- 🎮 **强化学习** — 智能体通过**试错 + 奖励**学习最优策略（AlphaGo）

:::callout icon=💡
解释题模板：「监督学习是……例如……」—— 定义 + 例子缺一不可，2025 年概念解释题就是这么评分的。
:::

%%NQ23%%

%%NQ24%%

%%%%% N13
## 🧹 数据与特征工程

**数据质量决定模型上限** —— 垃圾进，垃圾出（Garbage in, garbage out）。🧹

### 🧼 数据预处理

- 🕳️ **缺失值** — 删除行 / 均值中位数填充
- 📏 **归一化** — 把特征缩放到 [0,1] 或标准化为均值 0 方差 1（KNN、神经网络必需！）
- 🏷️ **编码类别** — 标签编码、独热编码（One-Hot）
- 📂 **数据集划分** — 训练集（学规律）/ 验证集（调参数）/ 测试集（最终考试，绝不能提前偷看！）

### 🛠️ 特征工程

从原始数据中**构造、选择最有用的特征**：比如从"日期"提取"是否周末"，从图像提取边缘。好特征让简单模型也能打。

%%NQ25%%

%%NQ26%%

%%%%% N14
## 📊 模型评估：混淆矩阵

怎么判断模型好不好？先认识**混淆矩阵**（二分类版）：

| | 预测 正 | 预测 负 |
| --- | --- | --- |
| **实际 正** | TP ✅ | FN ❌ |
| **实际 负** | FP ❌ | TN ✅ |

### 🧮 四大指标（必须会手算！）

- 准确率 Accuracy = (TP+TN) / 总数
- 精确率 Precision = TP / (TP+FP) — "说 positive 的里面有多少是真的"
- 召回率 Recall = TP / (TP+FN) — "真的 positive 里找出了多少"
- F1 = 2 × P × R / (P + R)

:::callout icon=⚠️
类别不平衡时准确率会骗人：99% 的人不患病，"全都预测健康"的模型准确率 99% 但毫无用处 —— 这时要看召回率。
:::

### 🎢 过拟合与欠拟合

- 🎢 **过拟合** — 训练集很好、测试集很差："死记硬背" → 对策：更多数据、正则化、简化模型
- 🛤️ **欠拟合** — 训练集测试集都差："没学会" → 对策：更复杂模型、更多特征
- 2025 年真题就考了用线性回归预测房价、两边误差都大 —— 答案是**欠拟合**！

%%NQ27%%

%%NQ28%%

%%%%% N15
## 👥 KNN 与决策树

### 👥 K 近邻（KNN）

"近朱者赤"：新样本的类别 = 它 **K 个最近邻居** 投票的结果。

**手算步骤**（选择题常考）：

1. 算新样本到每个训练样本的距离（常用欧氏距离 √Σ(xᵢ-yᵢ)²）
2. 取最近的 K 个
3. K 个邻居中**多数类别**为预测结果

⚠️ K 太小 → 对噪声敏感（过拟合）；K 太大 → 边界模糊（欠拟合）。K 一般取奇数避免平票。

### 🌳 决策树

像"20 个问题"游戏：每个节点问一个特征问题，叶子给出结论。

- 📊 选择"最好"的问题用**信息增益 / 基尼系数**（哪个特征能把类别分得最开）
- ✅ 优点：可解释性强、无需归一化；❌ 缺点：容易过拟合（树太深）→ 剪枝

:::callout icon=💡
**随机森林** = 很多棵决策树投票（集成学习），比单棵树更稳。
:::

%%NQ29%%

%%NQ30%%

%%%%% G05
## 🧮 AI 基本算法

从"概念"进入"会算"：**梯度下降、softmax、卷积、词向量** —— 选择题的手算重灾区。🧮

每个算法都配一道"考法"，练到能脱稿手算。

%%GQ5%%

%%%%% N16
## 📉 线性回归与梯度下降

### 📉 线性回归

找一条直线 ŷ = wx + b 拟合数据。怎么衡量拟合好坏？**损失函数（MSE 均方误差）**：

MSE = (1/n) Σ(yᵢ − ŷᵢ)²

### ⛰️ 梯度下降

"下山"算法：沿着**梯度的反方向**一小步一小步走到谷底（损失最小）。

- 更新公式：**w ← w − η · ∂L/∂w**（η 是学习率）
- 🚶 学习率太小 → 走太慢；🏃 太大 → 来回震荡甚至发散
- 手算考法：给 w=2、梯度=0.5、η=0.1 → 新 w = 2 − 0.1×0.5 = **1.95**

:::callout icon=💡
**随机梯度下降（SGD）**：每次只用一小批（mini-batch）样本算梯度 —— 快，还带随机扰动帮助跳出局部最优。
:::

%%NQ31%%

%%NQ32%%

%%%%% N17
## 🧠 神经网络与 Softmax

### 🧠 神经元与前向传播

一个神经元 = **加权求和 + 偏置 + 激活函数**：

output = f(w₁x₁ + w₂x₂ + b)

常用激活函数：Sigmoid（压到 0~1）、ReLU（负数归零，深度网络标配）、Tanh。

### 🎲 Softmax — 多分类输出（2025 真题第 11 题！）

把一组分数变成**和为 1 的概率**：

softmax(zᵢ) = e^{zᵢ} / Σ e^{zⱼ}

**真题手算**：输出 [2.0, 1.0, 1.0]：

- e² ≈ 7.39，e¹ ≈ 2.72，总和 ≈ 7.39 + 2.72 + 2.72 = 12.83
- 猫：7.39/12.83 ≈ **0.576**，狗 = 鸟 = 2.72/12.83 ≈ **0.212** ✅

:::callout icon=⚠️
记住 e ≈ 2.718，考场先算 e 的各次幂再除总和 —— 大分差的那一项概率一定最大。
:::

**反向传播**：从损失出发，用链式法则把误差逐层传回，更新每个权重 —— 训练的核心机制。

%%NQ33%%

%%NQ34%%

%%%%% N18
## 🖼️ CNN 卷积神经网络

**CNN** 是处理图像的专用神经网络，三大组件：

### 🔬 卷积层

一个小窗口（卷积核，如 3×3）在图像上滑动，每个位置做**对应相乘再求和**，提取局部特征（边缘、纹理）。

**输出尺寸公式**（选择题爱考）：

输出边长 = (输入边长 − 卷积核大小 + 2×填充) / 步长 + 1

例：输入 32×32，核 5×5，无填充，步长 1 → (32−5+0)/1+1 = **28×28**

### 🐟 池化层与全连接层

- 🐟 **池化**（如 2×2 最大池化）：把每个区域缩成一个数 —— 减小尺寸、保留最强特征
- 🔗 **全连接层**：把特征图展平后接分类器，最后用 softmax 输出概率

经典架构：**输入 → [卷积 → ReLU → 池化] × N → 全连接 → softmax**

%%NQ35%%

%%NQ36%%

%%%%% N19
## 💬 自然语言处理基础

计算机不认识文字，先要把语言变成数字。💬

### ✂️ 文本处理流水线

1. 🪓 **分词** — 中文如"我喜欢NOAI" → [我 / 喜欢 / NOAI]
2. 🗑️ **去停用词** — "的、了、是"这类高频无意义词
3. 🔢 **向量化** — 词 → 向量

### 🗺️ 词嵌入（Word Embedding）

把每个词映射成**低维稠密向量**，语义相近的词距离也近：

> 国王 − 男 + 女 ≈ 女王 👑

经典模型：**Word2Vec**。现代大模型用 **Transformer** 的注意力机制理解上下文。

:::callout icon=💡
真题方向：2025 年复赛考过"新闻文本分类"和"德语组合词分割" —— 掌握"分词 → 向量化 → 分类器"这条流水线就能应对。
:::

%%NQ37%%

%%NQ38%%

%%%%% N20
## ⚖️ AI 伦理与安全

AI 不只是技术，还是社会责任 —— 选择题必考板块。⚖️

### 🧭 四大考点

- ⚖️ **算法偏见** — 训练数据有偏见 → 模型歧视（如招聘模型压低女性分数）。对策：多样化数据、公平性审计
- 🔍 **可解释性** — 深度网络是"黑箱"，高风险场景（贷款、医疗）必须能解释决策。对策：**特征重要度分析**等可解释性技术（2025 真题第 6 题答案！）
- 🔒 **隐私保护** — 训练数据可能泄露个人信息。对策：数据脱敏、联邦学习
- 📰 **深度伪造（Deepfake）** — AI 生成的假人脸假语音，检测与溯源是研究热点（2025 复赛真题：合成语音检测！）

:::callout icon=💡
答伦理题的套路：**指出问题 → 分析原因（数据/模型）→ 给出对策**，三段式拿满分。
:::

%%NQ39%%

%%NQ40%%

%%%%% G06
## 🚀 面向中国站：工具与实战

水平测试 Top 200 进入**中国站**：6 小时上机，用 **sklearn 和 PyTorch** 解决真实 AI 问题。🚀

这一组是进阶内容：框架实战 + 真题拆解。SL…哦不，所有备赛者都值得学！

%%GQ6%%

%%%%% N21
## 🧪 scikit-learn 实战

**sklearn** 是机器学习的"瑞士军刀" —— 所有模型共享同一套 API：

```python
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import accuracy_score

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42)

scaler = StandardScaler()          # 归一化
X_train = scaler.fit_transform(X_train)
X_test = scaler.transform(X_test)  # 测试集只用 transform！

model = KNeighborsClassifier(n_neighbors=5)
model.fit(X_train, y_train)        # 训练
pred = model.predict(X_test)       # 预测
print(accuracy_score(y_test, pred))
```

### 🧰 常用模型速查

- `KNeighborsClassifier` / `DecisionTreeClassifier` / `RandomForestClassifier`
- `LogisticRegression`（分类！不是回归）、`LinearRegression`
- `KMeans`（聚类）、`PCA`（降维）

:::callout icon=⚠️
铁律：`fit` 只用训练集；测试集只 `transform`/`predict` —— 数据泄漏是实验报告最常被扣分的地方。
:::

%%NQ41%%

%%NQ42%%

%%%%% N22
## 🔥 PyTorch 入门

**PyTorch** 是深度学习框架，中国站的主战场。核心只有四步：**张量 → 模型 → 损失 → 优化循环**。

```python
import torch
import torch.nn as nn

model = nn.Sequential(
    nn.Linear(4, 16), nn.ReLU(),
    nn.Linear(16, 3))               # 4 特征 → 3 类别

loss_fn = nn.CrossEntropyLoss()     # 多分类损失（内含 softmax）
optimizer = torch.optim.SGD(model.parameters(), lr=0.01)

for epoch in range(100):
    pred = model(X_train)           # 前向传播
    loss = loss_fn(pred, y_train)   # 算损失
    optimizer.zero_grad()           # 清空旧梯度
    loss.backward()                 # 反向传播
    optimizer.step()                # 更新参数
```

### 🔑 五个必会概念

- 🧊 **Tensor** — 多维数组（GPU 加速）
- 📉 **损失函数** — CrossEntropyLoss（分类）、MSELoss（回归）
- 🔁 **训练循环** — 前向 → 损失 → `zero_grad` → `backward` → `step`
- 🧊 **Dataset / DataLoader** — 喂数据的流水线
- 💾 **保存模型** — `torch.save(model.state_dict(), "model.pt")`

:::callout icon=💡
中国站允许**查官方文档** —— 会读文档比背 API 更重要，这也是 IOAI 的核心能力要求。
:::

%%NQ43%%

%%NQ44%%

%%%%% N23
## 🏁 真题拆解与应试策略

两年复赛真题的方向（背下来！）：

### 📊 历年真题主题

- 2024：投篮命中率预测（ML）· 真假图像识别（CV）· 德语组合词分割（NLP）· 单摆运动（AI×物理）
- 2025：化学反应动力学（AI×化学）· 合成语音检测（音频）· 九宫格图分类（CV）· 新闻文本分类（NLP）

**规律**：机器学习基础 + 计算机视觉 + NLP 三足鼎立，外加 **AI×学科** 跨界题。

### 🎯 应试策略

- ✍️ **纸笔考**：平时就练手写代码 + 心中 trace；常用数值背下来（e≈2.718、softmax、卷积尺寸公式）
- 📖 **概念解释题**：定义 + 例子 + 一句应用，三段式
- 💻 **上机赛**：先跑通 baseline 再调优，`random_state` 固定保证可复现，边做边写实验报告
- ⏱️ **时间分配**：选择题不会就跳，编程题拿部分分 —— NOAI 沿袭奥赛传统，过程分是真的

:::callout icon=🎯
最后一课的作业：找一年真题，**掐表 120 分钟**完整做一遍，对照答案复盘每个失分点。这就是你从"学过"到"考过"的最后一步。祝旗开得胜！🏅
:::

%%NQ45%%

%%NQ46%%
