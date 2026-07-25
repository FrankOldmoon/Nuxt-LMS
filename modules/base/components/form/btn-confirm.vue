<template>
  <UPopover v-model:open="open" :ui="{ content: 'w-auto' }">
    <UButton v-bind="$attrs" @click.prevent="onClick" />
    <template #content>
      <div class="p-3 space-y-2 min-w-[180px]">
        <p class="text-sm text-highlighted">{{ confirmText || $t('form.btnConfirm.defaultText') }}</p>
        <div class="flex justify-end gap-2">
          <UButton size="xs" variant="ghost" @click="open = false">{{ $t('common.cancel') }}</UButton>
          <UButton size="xs" :color="color" :loading="loading" @click="onConfirm">{{ $t('common.confirm') }}</UButton>
        </div>
      </div>
    </template>
  </UPopover>
</template>

<script setup>
// 透传所有 UButton 的 props/attrs（label/icon/color/variant/size 等）
defineOptions({ inheritAttrs: false })

const props = defineProps({
  /** 确认提示文案 */
  confirmText: { type: String, default: '' },
  /** 确认按钮颜色（默认跟随 UButton color，不传用 primary） */
  color: { type: String, default: 'primary' },
  /** 确认按钮 loading 状态 */
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['confirm'])

const open = ref(false)

function onClick() {
  open.value = true
}

async function onConfirm() {
  // 若 confirm 是异步函数，loading 由父组件控制
  emit('confirm')
  // 同步场景：关闭弹窗；异步场景由父组件设置 loading 后手动关闭
  if (!props.loading) {
    open.value = false
  }
}

// loading 结束后自动关闭
watch(() => props.loading, (val) => {
  if (!val && open.value) {
    open.value = false
  }
})
</script>
