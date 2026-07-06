/**
 * WebSocket 小组功能方法
 *
 * 小组聊天室（纯内存转发，不持久化）
 */
import type { GroupChatCallback } from './types'
import { groupChatCallbacks } from './callbacks'
import type { useWsConnection } from './connection'

export function useWsGroup(conn: ReturnType<typeof useWsConnection>) {
  const { send, joinedGroupIds } = conn

  // ====================== 小组聊天室 ======================
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

  function onGroupChat(callback: GroupChatCallback) {
    groupChatCallbacks.push(callback)
  }

  return {
    joinGroup,
    leaveGroup,
    sendGroupChat,
    onGroupChat,
  }
}
