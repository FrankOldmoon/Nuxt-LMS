<template>
  <ClientOnly>
    <!-- Extension slot: subsequent modules (e.g. lms) can inject danmaku layer etc. client-only overlay -->
    <slot name="ws-overlay" />
  </ClientOnly>
</template>

<script setup lang="ts">
/**
 * WebSocket connection orchestrator
 *
 * base is only responsible for: establishing connection after login + sending registerUser (for direct message push).
 * Business messages (class/race/group/invite, etc.) are handled by subsequent modules via:
 *   - Client-side registerWsHandler(type, cb) to register callbacks
 *   - Server-side registerWsServerHandler(type, fn) + registerWsServerCleanup(fn)
 * on their own, base is unaware of them.
 */
const { user } = useAuth()
const { wsConnected, connect, send } = useWsConnection()

// Establish WS connection after login; re-send registerUser when already connected (handle connect-before-login scenario)
watch([() => user.value?.id, wsConnected], () => {
  if (user.value?.id) {
    if (!wsConnected.value) {
      connect()
    } else {
      // Already connected but user just logged in: re-send registerUser to register user-level connection
      send({ type: 'registerUser', userId: user.value.id, from: user.value.name })
    }
  }
}, { immediate: true })
</script>
