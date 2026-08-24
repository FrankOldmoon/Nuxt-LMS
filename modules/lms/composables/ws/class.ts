/**
 * WebSocket 班级功能方法
 *
 * 邀请跳转 / 弹幕 / 投票 / 抢答 / 在线状态 / 私信监听
 *
 * 连接层与回调注册表由 base 提供（useWsConnection / registerWsHandler），
 * 此处仅封装 lms 班级相关的 send / on 方法。
 */
export function useWsClass() {
  const { send } = useWsConnection()

  // ====================== 邀请 ======================
  function sendInvite(classId: number, courseId: number, chapterId: number, from: string = 'teacher') {
    send({ type: 'invite', classId, courseId, chapterId, from })
  }
  function onInvite(callback: (data: any) => void) {
    return registerWsHandler('invite', callback)
  }

  // ====================== 弹幕 ======================
  function isInIframe() {
    return window.top !== window.self
  }

  function sendDanmaku(classId: number, text: string, from: string = 'anonymous') {
    // iframe 嵌套环境下（如富文本内嵌预览）不发送弹幕，避免向课堂广播重复/干扰消息
    if (isInIframe()) return
    send({ type: 'danmaku', classId, text: text.slice(0, 200), from })
  }
  function onDanmaku(callback: (data: any) => void) {
    return registerWsHandler('danmaku', callback)
  }

  // ====================== 投票 ======================
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

  // ====================== 抢答 ======================
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

  // ====================== 在线状态 ======================
  function sendOnline(classId: number, userId: number, from: string, online: boolean) {
    send({ type: 'online', classId, userId, from, online })
  }
  function onOnlineUpdate(callback: (data: any) => void) {
    return registerWsHandler('onlineUpdate', callback)
  }

  // ====================== 私信推送 ======================
  function onMessage(callback: (data: any) => void) {
    return registerWsHandler('message', callback)
  }

  // ====================== 班级聊天室 ======================
  function sendChatroom(classId: number, userId: number, from: string, avatarImg: string | null, text: string) {
    send({ type: 'chatroom', classId, userId, from, avatarImg, text })
  }
  function onChatroom(callback: (data: any) => void) {
    return registerWsHandler('chatroom', callback)
  }

  // ====================== 章节访问权限同步 ======================
  /** 服务端在章节 isOpen / class_chapter.open 变更后广播，客户端收到后刷新侧边栏导航 */
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
