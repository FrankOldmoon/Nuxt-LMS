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
    latePenalty: 0.8,
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
  },
  chapter: {
    readExp: 1,
    readCoin: 1,
    readTimeThreshold: 30,
    readThresholdExp: 10,
    readThresholdCoin: 10,
    passScore: 60,
    // heading 任务完成时奖励（hover 阅读 + 互动组件提交全部答对）
    headingExp: 5,
    headingCoin: 5,
  },
  quiz: {
    submitExp: 3,
    submitCoin: 3,
    passScore: 60,
    passBonusExp: 10,
    passBonusCoin: 10,
  },
}
