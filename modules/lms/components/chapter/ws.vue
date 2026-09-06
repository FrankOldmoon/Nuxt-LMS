<template>
  <!-- 纯逻辑组件：显式空根节点，避免 SSR 无输出与客户端注释节点导致的水合错位 -->
  <span hidden aria-hidden="true" />
</template>

<script setup lang="ts">
const {user} = useAuth()
const classId = (user.value as any)?.defaultClass?.id || (user.value as any)?.classId || 0
const { joinRoom, leaveRoom } = useWebSocket()

onMounted(() => {
    joinRoom(classId.toString())
})

onUnmounted(() => {
    leaveRoom(classId.toString())
})
</script>