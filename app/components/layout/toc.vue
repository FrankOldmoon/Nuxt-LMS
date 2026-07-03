<template>
  <UPageAside>

    <LayoutTocList
      :links="tocLinks"
      :title="$t('layout.pageToc')"
      class="w-full"
    />

    <template #bottom>
      <!-- 页面内容编辑器（管理员或课程编辑者可见） -->
      <div v-if="canEditContent" class="hidden lg:flex flex-col gap-3 pt-4 mt-4 border-t border-default">
        <UModal v-model:open="editModalOpen" fullscreen scrollable>
          <UButton
            icon="i-lucide-edit"
            color="neutral"
            variant="ghost"
            size="sm"
            :label="$t('layout.editPage')"
            class="justify-start"
          />

          <template #body>
            <div class="p-4 min-w-[480px]">
              <ueditor v-model="editableContent" :save-handler="handleSave" ref="ueditorRef"/>
            </div>
          </template>
          <template #footer>
            <div class="flex justify-end gap-2 w-full">
              <UButton :label="$t('common.save')" color="primary" variant="solid" size="sm" :loading="saving" @click="handleSaveClick"/>
            </div>
          </template>
        </UModal>

        <!-- 历史记录 -->
        <ContentHistoryModal :table="editableTable" :id="editableId" />
      </div>
    </template>
  </UPageAside>
</template>

<script setup lang="ts">

const { hasRole, isCourseEditor } = useAuth()
const toast = useToast()
const { t } = useI18n()

const ueditorRef = ref()
const editModalOpen = ref(false)
const saving = ref(false)

// 使用全局可编辑内容，由 course/chapter 页面设置
const { tocLinks, editableContent, editableTable, editableId, editableCourseId, notifyContentSaved } = useLayoutState()
const nuxtApp = useNuxtApp()

// 仅管理员或当前课程编辑者可以编辑页面内容
const canEditContent = computed(() => {
  if (hasRole('admin')) return true
  if (editableTable.value === 'courses') return isCourseEditor(editableId.value)
  if (editableTable.value === 'chapters') return isCourseEditor(editableCourseId.value)
  return false
})

// 保存回调：调用 update API 将内容写回数据库
// content 可能是 UmoEditor 的内容对象（含 .json）或直接的 JSON 对象
async function handleSave(content: Record<string, any>) {
  const json = content?.json ?? content
  await cRequest(`/api/lms/${editableTable.value}/update`, {
    method: 'POST',
    body: { id: editableId.value, content: json },
  })
  return 1
}

// 点击保存按钮：用 editableContent 调用 API 保存，成功后清除缓存并通知页面刷新
async function handleSaveClick() {
  saving.value = true
  try {
    await handleSave(editableContent.value)

    // 清除相关 API 的 Nuxt 缓存，确保 refresh 拿到最新数据
    const table = editableTable.value
    const id = editableId.value
    const courseId = editableCourseId.value
    for (const key of Object.keys(nuxtApp.payload.data)) {
      if (key.includes(`/${table}/show`) || key.includes(`course_id=${courseId}`) || key.includes(`id=${id}`)) {
        delete nuxtApp.payload.data[key]
      }
    }

    toast.add({ title: t('layout.saveSuccess'), color: 'success' })
    editModalOpen.value = false

    // 在 nextTick 后通知页面刷新，确保弹窗关闭等状态已更新
    // 避免与 Vue 批量更新合并导致 watch 偶发不触发
    await nextTick()
    notifyContentSaved()
  } catch (e: any) {
    toast.add({ title: e.message || t('layout.saveFailed'), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>