<template>
  <!-- 纯逻辑组件：显式空根节点，避免 SSR 无输出与客户端注释节点导致的水合错位 -->
  <span hidden aria-hidden="true" />
</template>

<script setup lang="ts">
const { user } = useAuth()
const classId = computed(() => (user.value as any)?.defaultClass?.id || (user.value as any)?.classId || 0)
const { joinRoom, leaveRoom } = useWebSocket()

onMounted(() => {
    if (classId.value) joinRoom(classId.value.toString())
})

// 切换班级（select class → switchDefaultClass 会刷新 user.defaultClass）时同步切换 WS 房间；
// 否则仍停留在旧班级房间，老师端在线状态不会实时更新
watch(classId, (id, old) => {
    if (old) leaveRoom(old.toString())
    if (id) joinRoom(id.toString())
})

onUnmounted(() => {
    if (classId.value) leaveRoom(classId.value.toString())
})
</script>