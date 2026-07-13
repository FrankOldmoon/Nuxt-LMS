<template>

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