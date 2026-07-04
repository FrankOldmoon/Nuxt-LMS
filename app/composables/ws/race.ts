/**
 * WebSocket 竞赛（Race）功能方法
 *
 * 加入房间 / 开始竞赛 / 推送题目 / 提交答案 /
 * 结束题目 / 结束竞赛 / 竞赛在线状态
 */
import type {
  RaceJoinedCallback, RaceStartCallback, RaceQuestionCallback,
  RaceAnswerUpdateCallback, RaceScoresCallback, RaceQuestionEndCallback, RaceEndCallback,
  RaceOnlineUpdateCallback,
} from './types'
import {
  raceJoinedCallbacks, raceStartCallbacks, raceQuestionCallbacks,
  raceAnswerUpdateCallbacks, raceScoresCallbacks, raceQuestionEndCallbacks, raceEndCallbacks,
  raceOnlineUpdateCallbacks,
} from './callbacks'
import type { useWsConnection } from './connection'

export function useWsRace(conn: ReturnType<typeof useWsConnection>) {
  const { send } = conn

  function raceJoin(pin: string) {
    send({ type: 'raceJoin', pin })
  }
  function onRaceJoined(callback: RaceJoinedCallback) {
    raceJoinedCallbacks.push(callback)
  }

  function sendRaceStart(pin: string, raceCid: number, courseId: number, totalQuestions: number, timeLimit: number, from: string = 'teacher') {
    send({ type: 'raceStart', pin, raceCid, courseId, totalQuestions, timeLimit, from })
  }
  function onRaceStart(callback: RaceStartCallback) {
    raceStartCallbacks.push(callback)
  }

  function sendRaceQuestion(pin: string, raceCid: number, questionCid: number, questionIndex: number, totalQuestions: number, timeLimit: number) {
    send({ type: 'raceQuestion', pin, raceCid, questionCid, questionIndex, totalQuestions, timeLimit })
  }
  function onRaceQuestion(callback: RaceQuestionCallback) {
    raceQuestionCallbacks.push(callback)
  }

  function sendRaceAnswer(pin: string, raceCid: number, questionCid: number, answer: any, rate: number, correct: boolean, from: string, userId: number) {
    send({ type: 'raceAnswer', pin, raceCid, questionCid, answer, rate, correct, from, userId })
  }
  function onRaceAnswerUpdate(callback: RaceAnswerUpdateCallback) {
    raceAnswerUpdateCallbacks.push(callback)
  }
  function onRaceScores(callback: RaceScoresCallback) {
    raceScoresCallbacks.push(callback)
  }

  function sendRaceQuestionEnd(pin: string, raceCid: number) {
    send({ type: 'raceQuestionEnd', pin, raceCid })
  }
  function onRaceQuestionEnd(callback: RaceQuestionEndCallback) {
    raceQuestionEndCallbacks.push(callback)
  }

  function sendRaceEnd(pin: string, raceCid: number) {
    send({ type: 'raceEnd', pin, raceCid })
  }
  function onRaceEnd(callback: RaceEndCallback) {
    raceEndCallbacks.push(callback)
  }

  function sendRaceOnline(pin: string, userId: number, from: string, online: boolean) {
    send({ type: 'raceOnline', pin, userId, from, online })
  }
  function onRaceOnlineUpdate(callback: RaceOnlineUpdateCallback) {
    raceOnlineUpdateCallbacks.push(callback)
  }

  return {
    raceJoin, onRaceJoined,
    sendRaceStart, onRaceStart,
    sendRaceQuestion, onRaceQuestion,
    sendRaceAnswer, onRaceAnswerUpdate, onRaceScores,
    sendRaceQuestionEnd, onRaceQuestionEnd,
    sendRaceEnd, onRaceEnd,
    sendRaceOnline, onRaceOnlineUpdate,
  }
}
