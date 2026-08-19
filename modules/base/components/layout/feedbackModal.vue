<template>
  <UModal v-model:open="isOpen" :ui="{ content: 'sm:max-w-3xl' }" scrollable>
    <template #content>
      <div class="p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold">{{ $t('feedback.title') }}</h3>
        </div>

        <div class="space-y-4">
          <UFormField :label="$t('feedback.name')">
            <UInput v-model="form.name" :placeholder="$t('feedback.namePlaceholder')" />
          </UFormField>

          <UFormField :label="$t('feedback.type')">
            <USelect v-model="form.type" :items="typeOptions" />
          </UFormField>

          <UFormField :label="$t('feedback.content')">
            <Ueditor v-model="form.content" />
          </UFormField>
        </div>

        <div class="flex justify-end gap-2 pt-4">
          <UButton :label="$t('common.cancel')" color="neutral" variant="ghost" @click="isOpen = false" />
          <UButton :label="$t('common.save')" color="primary" :loading="saving" @click="submit" />
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const isOpen = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const toast = useToast()

const typeOptions = [
  { label: t('feedback.typeBug'), value: 'bug' },
  { label: t('feedback.typeSuggestion'), value: 'suggestion' },
  { label: t('feedback.typeRequirement'), value: 'requirement' },
]

const emptyContent = () => ({ content: {}, type: 'doc' as const })
const form = reactive<{ name: string; type: string; content: any }>({
  name: '',
  type: 'suggestion',
  content: emptyContent(),
})

const saving = ref(false)

// 每次打开时重置表单
watch(isOpen, (val) => {
  if (val) {
    form.name = ''
    form.type = 'suggestion'
    form.content = emptyContent()
  }
})

async function submit() {
  if (!form.name.trim()) {
    toast.add({ title: t('feedback.nameRequired'), color: 'error' })
    return
  }

  saving.value = true
  try {
    await cRequest('/api/feedback/add', {
      method: 'POST',
      body: { name: form.name.trim(), type: form.type, content: form.content },
    })
    toast.add({ title: t('feedback.submitSuccess'), color: 'success' })
    isOpen.value = false
  } catch (err: any) {
    toast.add({ title: err?.message || t('common.operationFailed'), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>