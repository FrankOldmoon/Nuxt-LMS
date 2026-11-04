/**
 * 提问意图检测：识别「把题目直接贴进来要答案」的情况
 *
 * 目的不是拒绝回答，而是在这种情况下切换到**教学模式**（讲考点、给思路、
 * 逐个分析选项，但不给最终答案）。直接硬拒会让正常提问也遭殃，也会让学生
 * 觉得莫名其妙；注入一条强约束的 system 提示，既保住对话能力又守住底线。
 *
 * 宁可漏判也不要错判：误判会把「A 和 B 有什么区别」这种正常提问也打成作业，
 * 体验很差。所以每类都给足特征才触发。
 */
export interface HomeworkIntent {
  /** 命中的类型，用于拼提示语气 */
  reason: string
}

/** 选项标记：A. / A、/ (A) / A) —— 行首或空格后，允许一行里挤多个选项 */
function countOptionLetters(text: string): number {
  // 中文选项常见的还有「A．」（全角点）和「A、」
  const marks = text.match(/(?:^|[\s，,；;、])[（(]?\s*([A-Ea-e])\s*[)）.．、:：]/g)
  if (!marks) return 0
  const set = new Set<string>()
  for (const m of marks) {
    const letter = m.replace(/[^A-Ea-e]/g, '')
    if (letter) set.add(letter.toUpperCase())
  }
  return set.size
}

/** 显式索要答案的说法 */
const ASK_ANSWER = /(直接|只要|赶快|快点|马上)?\s*(告诉|给|说|发)\s*(我|一下)?\s*(正确|标准|最终)?\s*(的)?\s*答案|选哪[个一项]|答案是(什么|啥)|标准答案是|正确答案是/

/** 要求代做 */
const ASK_DO = /(帮我|替我|帮忙|你来)\s*(做|写|答|填|完成|解决)\s*(一下|下)?\s*(这|那|一)?\s*(道|个|份)?\s*(题|作业|练习|quiz|考试)|代做|代写|照抄/

/** 填空特征 */
const FILL_BLANK = /_{3,}|＿{3,}|（\s{1,}）|\(\s{1,}\)/
const FILL_WORD = /填空|填上|填入|补全|空缺|横线处/

/** 判断对错 */
const JUDGE = /对(还是|或者|或)错|判断对错|是否正确|是对的(吗|嘛)|错的(吗|嘛)/

/** 编程题：明确提到题/作业 + 要完整实现 */
const CODE_TASK = /(编程题|算法题|这道题|题目要求)/

export function detectHomeworkIntent(raw: string): HomeworkIntent | null {
  const text = String(raw || '').trim()
  if (!text) return null

  // —— 强信号：不看长度，「帮我做这题」六个字也要拦 ——
  if (countOptionLetters(text) >= 3) return { reason: '选择题' }
  if (ASK_ANSWER.test(text)) return { reason: '直接索要答案' }
  if (ASK_DO.test(text)) return { reason: '要求代做' }

  // —— 弱信号：太短的句子容易误判（「这题呢？」），要求点长度 ——
  if (text.length < 12) return null

  // 填空题：有下划线/空括号 + 填空类措辞
  if (FILL_BLANK.test(text) && FILL_WORD.test(text)) return { reason: '填空题' }

  // 判断题：需要配合题目语境，否则「我这样做是否正确」这类正常提问会被误伤
  if (JUDGE.test(text) && text.length < 300 && /题|选项|说法|判断/.test(text)) {
    return { reason: '判断题' }
  }

  // 编程题：提到「这道题/编程题」且要求实现
  if (CODE_TASK.test(text) && /(实现|编写|写出|补全|完成|怎么写)/.test(text)) {
    return { reason: '编程题' }
  }

  return null
}

/** 命中后注入的教学模式指令 */
export function buildHomeworkGuardMessage(intent: HomeworkIntent): string {
  return `【教学模式 · 已检测到${intent.reason}】这条消息看起来是要求直接代做题目。

这属于必须由学生本人完成的计分内容，你不能给出最终答案或可直接提交的完整解答。请按下面的方式回应：

1. 先用一句话说明这题在考什么知识点（学生看得懂的话）。
2. 给出解题思路或第一个动作，让学生自己往下走。
3. 按题型处理：
   - 选择题：逐个说清每个选项为什么对、为什么错，但**不要直接说"选 X"**；
   - 填空题：只提示该空应该填什么**类型**的内容（类型名、关键词、长度），不给具体答案；
   - 编程题：给出函数签名、关键 API、伪代码骨架，**不要给可直接运行的完整代码**；
   - 判断题：说明判断依据和常见误区，不直接说对或错。
4. 结尾请学生先自己作答，并告诉他可以回来对思路、检查答案。

如果学生坚持要答案，说明这一步需要他自己完成，然后继续引导 —— 不要因为被催促就妥协。`
}
