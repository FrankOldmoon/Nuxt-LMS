/**
 * WebSocket group feature methods
 *
 * Group chat room (pure in-memory forwarding, no persistence)
 *
 * Connection layer and callback registry provided by base (useWsConnection / registerWsHandler).
 */
export function useWsGroup() {
  const { send, joinedGroupIds } = useWsConnection()

  // ====================== Group chat room ======================
  function joinGroup(groupId: string, userId?: number, from?: string) {
    joinedGroupIds.add(groupId)
    send({ type: 'joinGroup', groupId, userId, from })
  }

  function leaveGroup(groupId: string) {
    joinedGroupIds.delete(groupId)
    send({ type: 'leaveGroup', groupId })
  }

  function sendGroupChat(groupId: string, userId: number, from: string, avatarImg: string | null, text: string) {
    send({ type: 'groupChat', groupId, userId, from, avatarImg, text })
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
