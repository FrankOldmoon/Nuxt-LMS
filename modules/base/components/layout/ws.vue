<template>
  <ClientOnly>
    <!-- 弹幕层由 lms 模块通过 registerWsHandler 注入 -->
  </ClientOnly>
</template>

<script setup lang="ts">
const { user } = useAuth()
const { wsConnected, connect, joinClass } = useWebSocket()

watch([() => user.value?.id, wsConnected], () => {
  if (user.value?.id) {
    if (!wsConnected.value) {
      connect()
    } else {
      const classId = user.value?.defaultClass?.id || user.value?.classId
      if (classId) {
        joinClass(classId, user.value.id, user.value.name)
      }
    }
  }
}, { immediate: true })
</script>
