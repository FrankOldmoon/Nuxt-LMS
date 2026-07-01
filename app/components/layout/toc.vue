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
        <LayoutHistoryModal :table="editableTable" :id="editableId" />
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

// 仅管理员或当前课程编辑者可以编辑页面内容
const canEditContent = computed(() => {
  if (hasRole('admin')) return true
  if (editableTable.value === 'courses') return isCourseEditor(editableId.value)
  if (editableTable.value === 'chapters') return isCourseEditor(editableCourseId.value)
  return false
})

// 保存回调：调用 update API 将内容写回数据库
async function handleSave(content: Record<string, any>) {
  await cRequest(`/api/lms/${editableTable.value}/update`, {
    method: 'POST',
    body: { id: editableId.value, content: content.json },
  })
  notifyContentSaved()
  location.reload()
  return 1
}

// 点击保存按钮：触发 ueditor 保存，成功后关闭弹窗并提示
async function handleSaveClick() {
  saving.value = true
  try {
    await ueditorRef.value?.saveDocument()
    toast.add({ title: t('layout.saveSuccess'), color: 'success' })
    editModalOpen.value = false
  } catch (e: any) {
    toast.add({ title: e.message || t('layout.saveFailed'), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>