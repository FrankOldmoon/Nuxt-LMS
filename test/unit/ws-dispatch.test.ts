import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  dispatch,
  inviteCallbacks,
  danmakuCallbacks,
  voteStartCallbacks,
  voteUpdateCallbacks,
  voteEndCallbacks,
  quickAnswerStartCallbacks,
  quickAnswerResultCallbacks,
  quickAnswerEndCallbacks,
  raceStartCallbacks,
  raceQuestionCallbacks,
  raceAnswerUpdateCallbacks,
  raceScoresCallbacks,
  raceQuestionEndCallbacks,
  raceEndCallbacks,
  raceJoinedCallbacks,
  onlineUpdateCallbacks,
  raceOnlineUpdateCallbacks,
  messageCallbacks,
  chatroomCallbacks,
} from '../../app/composables/ws/callbacks'

describe('dispatch', () => {
  beforeEach(() => {
    // Clear all callback arrays between tests
    inviteCallbacks.length = 0
    danmakuCallbacks.length = 0
    voteStartCallbacks.length = 0
    voteUpdateCallbacks.length = 0
    voteEndCallbacks.length = 0
    quickAnswerStartCallbacks.length = 0
    quickAnswerResultCallbacks.length = 0
    quickAnswerEndCallbacks.length = 0
    raceStartCallbacks.length = 0
    raceQuestionCallbacks.length = 0
    raceAnswerUpdateCallbacks.length = 0
    raceScoresCallbacks.length = 0
    raceQuestionEndCallbacks.length = 0
    raceEndCallbacks.length = 0
    raceJoinedCallbacks.length = 0
    onlineUpdateCallbacks.length = 0
    raceOnlineUpdateCallbacks.length = 0
    messageCallbacks.length = 0
    chatroomCallbacks.length = 0
  })

  it('dispatches invite to registered callbacks', () => {
    const cb = vi.fn()
    inviteCallbacks.push(cb)
    dispatch('invite', { userId: 1 })
    expect(cb).toHaveBeenCalledWith({ userId: 1 })
  })

  it('dispatches danmaku to registered callbacks', () => {
    const cb = vi.fn()
    danmakuCallbacks.push(cb)
    dispatch('danmaku', { text: 'hello' })
    expect(cb).toHaveBeenCalledWith({ text: 'hello' })
  })

  it('dispatches voteStart to registered callbacks', () => {
    const cb = vi.fn()
    voteStartCallbacks.push(cb)
    dispatch('voteStart', { id: 1 })
    expect(cb).toHaveBeenCalledWith({ id: 1 })
  })

  it('dispatches voteUpdate to registered callbacks', () => {
    const cb = vi.fn()
    voteUpdateCallbacks.push(cb)
    dispatch('voteUpdate', { results: [] })
    expect(cb).toHaveBeenCalledWith({ results: [] })
  })

  it('dispatches voteEnd to registered callbacks', () => {
    const cb = vi.fn()
    voteEndCallbacks.push(cb)
    dispatch('voteEnd', { id: 1 })
    expect(cb).toHaveBeenCalledWith({ id: 1 })
  })

  it('dispatches quickAnswerStart to registered callbacks', () => {
    const cb = vi.fn()
    quickAnswerStartCallbacks.push(cb)
    dispatch('quickAnswerStart', { q: 'test' })
    expect(cb).toHaveBeenCalledWith({ q: 'test' })
  })

  it('dispatches quickAnswerResult to registered callbacks', () => {
    const cb = vi.fn()
    quickAnswerResultCallbacks.push(cb)
    dispatch('quickAnswerResult', { winner: 1 })
    expect(cb).toHaveBeenCalledWith({ winner: 1 })
  })

  it('dispatches quickAnswerEnd without data (calls cb())', () => {
    const cb = vi.fn()
    quickAnswerEndCallbacks.push(cb)
    dispatch('quickAnswerEnd', { some: 'data' })
    expect(cb).toHaveBeenCalledWith()
  })

  it('dispatches raceStart to registered callbacks', () => {
    const cb = vi.fn()
    raceStartCallbacks.push(cb)
    dispatch('raceStart', { id: 1 })
    expect(cb).toHaveBeenCalledWith({ id: 1 })
  })

  it('dispatches raceQuestion to registered callbacks', () => {
    const cb = vi.fn()
    raceQuestionCallbacks.push(cb)
    dispatch('raceQuestion', { qid: 5 })
    expect(cb).toHaveBeenCalledWith({ qid: 5 })
  })

  it('dispatches raceAnswerUpdate to registered callbacks', () => {
    const cb = vi.fn()
    raceAnswerUpdateCallbacks.push(cb)
    dispatch('raceAnswerUpdate', { userId: 1 })
    expect(cb).toHaveBeenCalledWith({ userId: 1 })
  })

  it('dispatches raceScores to registered callbacks', () => {
    const cb = vi.fn()
    raceScoresCallbacks.push(cb)
    dispatch('raceScores', { scores: [] })
    expect(cb).toHaveBeenCalledWith({ scores: [] })
  })

  it('dispatches raceQuestionEnd to registered callbacks', () => {
    const cb = vi.fn()
    raceQuestionEndCallbacks.push(cb)
    dispatch('raceQuestionEnd', { qid: 1 })
    expect(cb).toHaveBeenCalledWith({ qid: 1 })
  })

  it('dispatches raceEnd to registered callbacks', () => {
    const cb = vi.fn()
    raceEndCallbacks.push(cb)
    dispatch('raceEnd', { id: 1 })
    expect(cb).toHaveBeenCalledWith({ id: 1 })
  })

  it('dispatches raceJoined to registered callbacks', () => {
    const cb = vi.fn()
    raceJoinedCallbacks.push(cb)
    dispatch('raceJoined', { userId: 1 })
    expect(cb).toHaveBeenCalledWith({ userId: 1 })
  })

  it('dispatches onlineUpdate to registered callbacks', () => {
    const cb = vi.fn()
    onlineUpdateCallbacks.push(cb)
    dispatch('onlineUpdate', { count: 5 })
    expect(cb).toHaveBeenCalledWith({ count: 5 })
  })

  it('dispatches raceOnlineUpdate to registered callbacks', () => {
    const cb = vi.fn()
    raceOnlineUpdateCallbacks.push(cb)
    dispatch('raceOnlineUpdate', { count: 3 })
    expect(cb).toHaveBeenCalledWith({ count: 3 })
  })

  it('dispatches message to registered callbacks', () => {
    const cb = vi.fn()
    messageCallbacks.push(cb)
    dispatch('message', { text: 'hi' })
    expect(cb).toHaveBeenCalledWith({ text: 'hi' })
  })

  it('dispatches chatroom to registered callbacks', () => {
    const cb = vi.fn()
    chatroomCallbacks.push(cb)
    dispatch('chatroom', { msg: 'hello' })
    expect(cb).toHaveBeenCalledWith({ msg: 'hello' })
  })

  it('calls all registered callbacks for a type', () => {
    const cb1 = vi.fn()
    const cb2 = vi.fn()
    const cb3 = vi.fn()
    inviteCallbacks.push(cb1, cb2, cb3)
    dispatch('invite', { x: 1 })
    expect(cb1).toHaveBeenCalledWith({ x: 1 })
    expect(cb2).toHaveBeenCalledWith({ x: 1 })
    expect(cb3).toHaveBeenCalledWith({ x: 1 })
  })

  it('does nothing for unknown type', () => {
    const cb = vi.fn()
    inviteCallbacks.push(cb)
    dispatch('unknownType', { data: 1 })
    expect(cb).not.toHaveBeenCalled()
  })

  it('does nothing when no callbacks registered', () => {
    expect(() => dispatch('invite', { data: 1 })).not.toThrow()
  })

  it('only dispatches to the correct type', () => {
    const inviteCb = vi.fn()
    const danmakuCb = vi.fn()
    inviteCallbacks.push(inviteCb)
    danmakuCallbacks.push(danmakuCb)
    dispatch('invite', { x: 1 })
    expect(inviteCb).toHaveBeenCalledWith({ x: 1 })
    expect(danmakuCb).not.toHaveBeenCalled()
  })
})
