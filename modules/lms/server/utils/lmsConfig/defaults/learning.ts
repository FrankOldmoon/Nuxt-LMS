/**
 * LMS 学习行为参数（题目/作业/评论/章节/测验）
 */
export const learningDefaults = {
  question: {
    submitExp: 2,
    correctBonusExp: 5,
    firstCorrectBonusExp: 10,
    maxSubmitCount: 999,
  },
  homework: {
    submitExp: 5,
    resubmitExp: 1,
    latePenalty: 0.8,
  },
  comment: {
    publishExp: 3,
    replyExp: 2,
    likeReceivedExp: 1,
    maxDailyExp: 20,
  },
  chapter: {
    readExp: 1,
    readTimeThreshold: 30,
    readThresholdExp: 10,
    passScore: 60,
  },
  quiz: {
    submitExp: 3,
    passScore: 60,
    passBonusExp: 10,
  },
}
