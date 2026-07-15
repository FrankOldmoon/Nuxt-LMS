/**
 * LMS learning activity parameters (question/homework/comment/chapter/quiz)
 *
 * Each activity configures both exp (experience) and coin; the two are logically independent and accumulate separately.
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
    // Reward when heading task is completed (hover reading + interactive component all answered correctly)
    // - headingExp: experience
    // - headingCoin: coin
    // - headingScore: course marksScore (used for total score calculation)
    headingExp: 5,
    headingCoin: 5,
    headingScore: 5,
  },
  quiz: {
    submitExp: 3,
    submitCoin: 3,
    passScore: 60,
    passBonusExp: 10,
    passBonusCoin: 10,
  },
  /**
   * Toggles for class danmaku broadcast after submission (controls the behavior of the server
   * broadcasting danmaku to the class room after questions / homeworks / quizzes / comments are submitted).
   *
   * - enableOn{Kind}: independent master switch for each kind
   * - questionOnlyOnCorrect: whether to also broadcast when the question is answered wrong (default: only broadcast when answered correctly)
   * - onlyOnReward: only broadcast when exp can be gained this submission (gainedExp > 0).
   *   For question / homework / quiz, takes effect when the caller passes gainedExp;
   *   For comment, not constrained by this toggle by default (comments usually gain publishExp/replyExp).
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
