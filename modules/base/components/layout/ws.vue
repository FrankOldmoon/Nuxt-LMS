<template>
  <ClientOnly>
    <!-- 扩展 slot：后续模块（如 lms）可注入弹幕层等 client-only overlay -->
    <slot name="ws-overlay" />
  </ClientOnly>
</template>

<script setup lang="ts">
/**
 * WebSocket 连接编排器
 *
 * base 仅负责：登录后建立连接 + 发送 registerUser（用于私信推送）。
 * 业务消息（class/race/group/invite 等）由后续模块通过：
 *   - 客户端 registerWsHandler(type, cb) 注册回调
 *   - 服务端 registerWsServerHandler(type, fn) + registerWsServerCleanup(fn)
 * 自行处理，base 不感知。
 */
const { user } = useAuth()
const { wsConnected, connect, send } = useWsConnection()

// 登录后建立 WS 连接；已连接时补发 registerUser（处理先连接后登录场景）
watch([() => user.value?.id, wsConnected], () => {
  if (user.value?.id) {
    if (!wsConnected.value) {
      connect()
    } else {
      // 已连接但用户刚登录：补发 registerUser 注册用户级连接
      send({ type: 'registerUser', userId: user.value.id, from: user.value.name })
    }
  }
}, { immediate: true })
</script>
