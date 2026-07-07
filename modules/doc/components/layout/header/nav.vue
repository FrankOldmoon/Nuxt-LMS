<template>
  <div class="flex items-center gap-2">
    <UNavigationMenu
      :items="links"
      :orientation="orientation"
      :highlight="highlight"
      :content-orientation="orientation === 'horizontal' ? 'vertical' : 'vertical'"
      color="primary"
      variant="pill"
    />
    <NavEditor
      v-if="hasRole('admin')"
      mode="category"
      :navigation="links.slice(1)"
      @saved="handleSaved"
    />
    <!-- 课程导入（仅管理员） -->
    <UTooltip v-if="hasRole('admin')" :text="$t('navEditor.importCourse')">
      <UButton
        icon="i-lucide-upload"
        color="primary"
        variant="soft"
        size="sm"
        :loading="importing"
        @click="triggerFilePicker"
      />
    </UTooltip>
    <input
      ref="fileInputRef"
      type="file"
      accept="application/json,.json"
      class="hidden"
      @change="onFileSelected"
    >
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  orientation?: 'horizontal' | 'vertical'
  highlight?: boolean
}>(), {
  orientation: 'horizontal',
  highlight: true,
})

const { hasRole } = useAuth()
const { links, refresh } = useHeaderNav()
const toast = useToast()
const { t } = useI18n()

const importing = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

async function handleSaved() {
  if (refresh) {
    await refresh()
  }
}

/** 触发文件选择 */
function triggerFilePicker() {
  fileInputRef.value?.click()
}

/**
 * 选择文件后：
 * 1. 解析 JSON
 * 2. 调用 /api/courses/import
 * 3. 成功后弹 toast，刷新导航
 */
async function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  // 清空 value，允许重复选择同一文件
  input.value = ''
  if (!file) return

  if (!file.name.endsWith('.json')) {
    toast.add({
      title: t('navEditor.importFailed'),
      description: t('navEditor.selectFile'),
      color: 'error',
    })
    return
  }

  importing.value = true
  try {
    const text = await file.text()
    const data = JSON.parse(text)
    const result = await cRequest<any>('/api/courses/import', {
      method: 'POST',
      body: { data },
    })
    const summary = result
      ? `${result.chapters ?? 0} chapters, ${result.questions ?? 0} questions, ${result.homeworks ?? 0} homeworks, ${result.comments ?? 0} comments`
      : ''
    toast.add({
      title: t('navEditor.importSuccess'),
      description: summary,
      color: 'success',
    })
    // 刷新顶部导航，让新课程显示出来
    if (refresh) await refresh()
  } catch (err: any) {
    toast.add({
      title: t('navEditor.importFailed'),
      description: err?.message || String(err),
      color: 'error',
    })
  } finally {
    importing.value = false
  }
}
</script>
