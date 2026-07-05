export default defineWebSocketHandler({
  open() {},
  message(peer, message) {
    try {
      const data = JSON.parse(message.text())
      if (data.type === 'lockJoin') {
        handleLockJoin(peer, data)
      } else if (data.type === 'lockRelease') {
        handleLockRelease(peer)
      }
    } catch {
      peer.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }))
    }
  },
  close(peer) {
    cleanupPeer(peer)
  },
  error(_peer, error) {
    console.error('ws_lock error:', error)
  },
})

const lockRooms = new Map<string, Set<any>>()
const lockHolders = new Map<string, { userId: number; userName: string; peer: any }>()

function handleLockJoin(peer: any, data: { lockId: string; userId: number; userName: string }) {
  const { lockId, userId, userName } = data
  if (!lockId) return

  peer._lockId = lockId
  peer._userId = userId
  peer._userName = userName

  if (!lockRooms.has(lockId)) {
    lockRooms.set(lockId, new Set())
  }
  lockRooms.get(lockId)!.add(peer)

  const holder = lockHolders.get(lockId)
  if (holder && holder.peer !== peer && holder.peer.readyState === 1) {
    peer.send(JSON.stringify({
      type: 'lockDenied',
      lockId,
      lockedBy: holder.userName,
    }))
  } else {
    lockHolders.set(lockId, { userId, userName, peer })
    peer.send(JSON.stringify({ type: 'lockAcquired', lockId }))
  }
}

function handleLockRelease(peer: any) {
  const lockId = peer._lockId
  if (!lockId) return
  releaseLock(lockId, peer)
  removeFromRoom(lockId, peer)
  peer._lockId = undefined
}

function releaseLock(lockId: string, leavingPeer: any) {
  const holder = lockHolders.get(lockId)
  if (!holder || holder.peer !== leavingPeer) return

  lockHolders.delete(lockId)

  const room = lockRooms.get(lockId)
  if (!room) return

  for (const p of room) {
    if (p !== leavingPeer && p.readyState === 1) {
      lockHolders.set(lockId, { userId: p._userId, userName: p._userName, peer: p })
      p.send(JSON.stringify({ type: 'lockAcquired', lockId }))

      for (const other of room) {
        if (other !== p && other !== leavingPeer && other.readyState === 1) {
          other.send(JSON.stringify({
            type: 'lockDenied',
            lockId,
            lockedBy: p._userName,
          }))
        }
      }
      break
    }
  }
}

function removeFromRoom(lockId: string, peer: any) {
  const room = lockRooms.get(lockId)
  if (!room) return
  room.delete(peer)
  if (room.size === 0) {
    lockRooms.delete(lockId)
  }
}

function cleanupPeer(peer: any) {
  const lockId = peer._lockId
  if (!lockId) return
  releaseLock(lockId, peer)
  removeFromRoom(lockId, peer)
}
