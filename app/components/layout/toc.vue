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
        <UModal fullscreen scrollable>
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
              <ueditor v-model="editableContent" :save-handler="handleSave" />
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
  // 通知页面刷新数据
  notifyContentSaved()
  return 1
}
</script>