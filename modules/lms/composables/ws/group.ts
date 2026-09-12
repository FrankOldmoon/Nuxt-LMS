/**
 * WebSocket 小组功能方法
 *
 * 小组聊天室（纯内存转发，不持久化）
 *
 * 连接层与回调注册表由 base 提供（useWsConnection / registerWsHandler）。
 */
export function useWsGroup() {
  const { send, joinedGroupIds } = useWsConnection()

  // ====================== 小组聊天室 ======================
  function joinGroup(groupId: string, userId?: number, from?: string) {
    joinedGroupIds.add(groupId)
    send({ type: 'joinGroup', groupId, userId, from })
  }

  function leaveGroup(groupId: string) {
    joinedGroupIds.delete(groupId)
    send({ type: 'leaveGroup', groupId })
  }

  function sendGroupChat(groupId: string, userId: number, from: string, avatarImg: string | null, text: string, avatarFrame?: string | null) {
    send({ type: 'groupChat', groupId, userId, from, avatarImg, avatarFrame, text })
  }

  function onGroupChat(callback: (data: any) => void) {
    return registerWsHandler('groupChat', callback)
  }

  return {
    joinGroup,
    leaveGroup,
    sendGroupChat,
    onGroupChat,
  }
}
