<template>
  <ClientOnly>
    <ChapterDanmaku v-if="showDanmaku" />
  </ClientOnly>
</template>

<script setup lang="ts">
const { user } = useAuth()
const { wsConnected, connect, joinClass, onOnlineUpdate } = useWebSocket()
const { showDanmaku } = useLayoutState()
const classIdNum = computed(() => user.value?.defaultClass?.id || user.value?.classId)

watch([classIdNum, wsConnected], () => {
  if (classIdNum.value) {
    if (!wsConnected.value) {
      connect()
    } else {
      joinClass(classIdNum.value, user.value?.id, user.value?.name)
    }
  }
}, { immediate: true })
</script>
