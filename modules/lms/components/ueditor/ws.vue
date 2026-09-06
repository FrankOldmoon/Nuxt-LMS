<template>
  <!-- 纯逻辑组件：显式空根节点，避免 SSR 无输出与客户端注释节点导致的水合错位 -->
  <span hidden aria-hidden="true" />
</template>

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
