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
// Pass through all UButton props/attrs (label/icon/color/variant/size, etc.)
defineOptions({ inheritAttrs: false })

const props = defineProps({
  /** Confirmation prompt text */
  confirmText: { type: String, default: '' },
  /** Confirm button color (defaults to follow UButton color, uses primary if not provided) */
  color: { type: String, default: 'primary' },
  /** Confirm button loading state */
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['confirm'])

const open = ref(false)

function onClick() {
  open.value = true
}

async function onConfirm() {
  // If confirm is an async function, loading is controlled by the parent component
  emit('confirm')
  // Sync scenario: close popup; async scenario: parent sets loading then closes manually
  if (!props.loading) {
    open.value = false
  }
}

// Auto-close after loading ends
watch(() => props.loading, (val) => {
  if (!val && open.value) {
    open.value = false
  }
})
</script>
