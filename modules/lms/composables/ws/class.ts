/**
 * WebSocket class feature methods
 *
 * Invite redirect / danmaku / vote / quick answer / online status / private message listening
 *
 * The connection layer and callback registry are provided by base (useWsConnection / registerWsHandler),
 * here only wraps lms class-related send / on methods.
 */
export function useWsClass() {
  const { send } = useWsConnection()

  // ====================== Invite ======================
  function sendInvite(classId: number, courseId: number, chapterId: number, from: string = 'teacher') {
    send({ type: 'invite', classId, courseId, chapterId, from })
  }
  function onInvite(callback: (data: any) => void) {
    return registerWsHandler('invite', callback)
  }

  // ====================== Danmaku ======================
  function sendDanmaku(classId: number, text: string, from: string = 'anonymous') {
    send({ type: 'danmaku', classId, text: text.slice(0, 200), from })
  }
  function onDanmaku(callback: (data: any) => void) {
    return registerWsHandler('danmaku', callback)
  }

  // ====================== Vote ======================
  function sendVoteStart(classId: number, voteId: string, question: string, options: string[]) {
    send({ type: 'voteStart', classId, voteId, question, options })
  }
  function onVoteStart(callback: (data: any) => void) {
    return registerWsHandler('voteStart', callback)
  }
  function sendVoteSubmit(classId: number, voteId: string, optionIndex: number, from: string) {
    send({ type: 'voteSubmit', classId, voteId, optionIndex, from })
  }
  function onVoteUpdate(callback: (data: any) => void) {
    return registerWsHandler('voteUpdate', callback)
  }
  function sendVoteEnd(classId: number, voteId: string) {
    send({ type: 'voteEnd', classId, voteId })
  }
  function onVoteEnd(callback: (data: any) => void) {
    return registerWsHandler('voteEnd', callback)
  }

  // ====================== Quick answer ======================
  function sendQuickAnswerStart(classId: number, question: string) {
    send({ type: 'quickAnswerStart', classId, question })
  }
  function onQuickAnswerStart(callback: (data: any) => void) {
    return registerWsHandler('quickAnswerStart', callback)
  }
  function sendQuickAnswerSubmit(classId: number, from: string) {
    send({ type: 'quickAnswerSubmit', classId, from })
  }
  function onQuickAnswerResult(callback: (data: any) => void) {
    return registerWsHandler('quickAnswerResult', callback)
  }
  function sendQuickAnswerEnd(classId: number) {
    send({ type: 'quickAnswerEnd', classId })
  }
  function onQuickAnswerEnd(callback: () => void) {
    return registerWsHandler('quickAnswerEnd', callback as (data: any) => void)
  }

  // ====================== Online status ======================
  function sendOnline(classId: number, userId: number, from: string, online: boolean) {
    send({ type: 'online', classId, userId, from, online })
  }
  function onOnlineUpdate(callback: (data: any) => void) {
    return registerWsHandler('onlineUpdate', callback)
  }

  // ====================== Private message push ======================
  function onMessage(callback: (data: any) => void) {
    return registerWsHandler('message', callback)
  }

  // ====================== Class chatroom ======================
  function sendChatroom(classId: number, userId: number, from: string, avatarImg: string | null, text: string) {
    send({ type: 'chatroom', classId, userId, from, avatarImg, text })
  }
  function onChatroom(callback: (data: any) => void) {
    return registerWsHandler('chatroom', callback)
  }

  // ====================== Chapter access sync ======================
  /** Server broadcasts after chapter isOpen / class_chapter.open changes, client refreshes sidebar navigation upon receipt */
  function onChapterAccessUpdate(callback: (data: any) => void) {
    return registerWsHandler('chapterAccessUpdate', callback)
  }

  return {
    sendInvite, onInvite,
    sendDanmaku, onDanmaku,
    sendVoteStart, onVoteStart, sendVoteSubmit, onVoteUpdate, sendVoteEnd, onVoteEnd,
    sendQuickAnswerStart, onQuickAnswerStart, sendQuickAnswerSubmit, onQuickAnswerResult, sendQuickAnswerEnd, onQuickAnswerEnd,
    sendOnline, onOnlineUpdate,
    onMessage,
    sendChatroom, onChatroom,
    onChapterAccessUpdate,
  }
}
