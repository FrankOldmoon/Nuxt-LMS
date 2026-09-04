/**
 * LMS 竞赛参数
 *
 * 每种行为同时配置 exp（经验值）和 coin（金币）。
 * 注：rank1/2/3 排名奖励与 participateExp 参与奖的发放逻辑见 races/submit.post.ts。
 */
export const raceDefaults = {
  participateExp: 5,
  participateCoin: 5,
  rank1Exp: 100,
  rank1Coin: 100,
  rank2Exp: 80,
  rank2Coin: 80,
  rank3Exp: 60,
  rank3Coin: 60,
  // 参与竞赛提交奖励的章节分（课程 raceScore 为最高分模式）
  chapterScore: 3,
}
