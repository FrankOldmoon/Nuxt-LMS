<template>
  <UModal v-model:open="isOpen" :ui="{ content: 'sm:max-w-3xl' }" scrollable>
    <template #content>
      <div class="p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold">{{ $t('feedback.title') }}</h3>
        </div>

        <div class="space-y-4">
          <UFormField :label="$t('feedback.name')">
            <UInput v-model="form.name" class="w-full" :placeholder="$t('feedback.namePlaceholder')" />
          </UFormField>

          <UFormField :label="$t('feedback.type')">
            <USelect v-model="form.type" :items="typeOptions" class="w-full" />
          </UFormField>

          <UFormField :label="$t('feedback.content')">
            <div class="w-full space-y-2">
              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                class="hidden"
                @change="onFileChange"
              />
              <UButton
                v-if="!form.content"
                icon="i-lucide-image-plus"
                color="primary"
                variant="outline"
                :label="$t('feedback.chooseImage')"
                @click="fileInput?.click()"
              />
              <div v-else class="flex items-start gap-3">
                <img
                  :src="form.content"
                  class="max-h-40 max-w-full rounded border border-default/50 object-contain"
                  alt="feedback preview"
                />
                <div class="flex flex-col gap-1">
                  <UButton
                    icon="i-lucide-rotate-ccw"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    :label="$t('feedback.reChoose')"
                    @click="fileInput?.click()"
                  />
                  <UButton
                    icon="i-lucide-x"
                    color="error"
                    variant="ghost"
                    size="xs"
                    :label="$t('common.cancel')"
                    @click="clearContent"
                  />
                </div>
              </div>
            </div>
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

const emptyContent = () => ''
const form = reactive<{ name: string; type: string; content: string }>({
  name: '',
  type: 'suggestion',
  content: emptyContent(),
})

const saving = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

// 每次打开时重置表单
watch(isOpen, (val) => {
  if (val) {
    form.name = ''
    form.type = 'suggestion'
    form.content = emptyContent()
    if (fileInput.value) fileInput.value.value = ''
  }
})

/** 读取图片文件为 base64 data URL */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('图片读取失败'))
    reader.readAsDataURL(file)
  })
}

/** 选择图片：压缩后转 base64 存入 content */
async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const compressed = await compressImage(file)
    form.content = await fileToBase64(compressed)
  } catch (err: any) {
    toast.add({ title: err?.message || t('common.operationFailed'), color: 'error' })
    if (fileInput.value) fileInput.value.value = ''
  }
}

function clearContent() {
  form.content = ''
  if (fileInput.value) fileInput.value.value = ''
}

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