/**
 * LMS 学习行为参数（题目/作业/评论/章节/测验）
 *
 * 每种行为同时配置 exp（经验值）和 coin（金币），两者逻辑独立、各自累加。
 */
export const learningDefaults = {
  question: {
    submitExp: 2,
    submitCoin: 2,
    correctBonusExp: 5,
    correctBonusCoin: 5,
    firstCorrectBonusExp: 10,
    firstCorrectBonusCoin: 10,
    maxSubmitCount: 999,
  },
  homework: {
    submitExp: 5,
    submitCoin: 5,
    resubmitExp: 1,
    resubmitCoin: 1,
  },
  comment: {
    publishExp: 3,
    publishCoin: 3,
    replyExp: 2,
    replyCoin: 2,
    likeReceivedExp: 1,
    likeReceivedCoin: 1,
    maxDailyExp: 20,
    maxDailyCoin: 20,
    // 每主题回复数上限：同一用户在同一个父 comment（主题）下最多回复条数（防刷回复奖励）
    maxCommentCount: 2,
  },
  chapter: {
    // heading 任务完成时奖励（hover 阅读 + 互动组件提交全部答对）
    // - headingExp: 经验值
    // - headingCoin: 金币
    // - headingScore: 课程 altitudeScore（用于总分计算）
    headingExp: 5,
    headingCoin: 5,
    headingScore: 2,
  },
  quiz: {
    submitExp: 3,
    submitCoin: 3,
    passScore: 60,
    passBonusExp: 10,
    passBonusCoin: 10,
  },
  /**
   * 提交后班级弹幕广播开关（控制 questions / homeworks / quizzes / comments 提交后
   * 服务端向班级房间广播 danmaku 的行为）。
   *
   * - enableOn{Kind}：每种类型独立的总开关
   * - questionOnlyOnCorrect：题目答错时是否也广播（默认仅在答对时广播）
   * - onlyOnReward：仅在本次提交能获得经验时广播（gainedExp > 0）。
   *   对 question / homework / quiz 由调用方传入 gainedExp 即可生效；
   *   对 comment 默认不受此开关约束（评论通常都能拿到 publishExp/replyExp）。
   */
  danmaku: {
    enableOnQuestion: true,
    enableOnHomework: true,
    enableOnQuiz: true,
    enableOnComment: true,
    questionOnlyOnCorrect: true,
    onlyOnReward: true,
  },
}
