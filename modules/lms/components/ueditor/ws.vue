<template></template>

<script setup>
import { useWs } from './useWs'

const props = defineProps({
  lockId: {
    type: [String, Number],
    default: null,
  },
})

const emit = defineEmits(['update:readonly'])

const { isLockedByOther } = useWs(props, emit)

defineExpose({ isLockedByOther })
</script>
