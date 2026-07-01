<template>
  <UPageAside>

    <LayoutTocList
      :links="tocLinks"
      :title="$t('layout.pageToc')"
      class="w-full"
    />

    <template #bottom>
      <div class="hidden lg:flex flex-col gap-3 pt-4 mt-4 border-t border-default">
        <!-- 使用 UModal 包裹触发按钮，并通过 #content 插槽放入编辑器 -->
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
      </div>
    </template>
  </UPageAside>
</template>

<script setup lang="ts">

// 使用全局可编辑内容，由 course/chapter 页面设置
const { tocLinks, editableContent, editableTable, editableId, notifyContentSaved } = useLayoutState()

// 保存回调：调用 update API 将内容写回数据库
async function handleSave(content: Record<string, any>) {
  await cRequest.post(`/api/lms/${editableTable.value}/update`, {
    id: editableId.value,
    content: content.json,
  })
  // 通知页面刷新数据
  notifyContentSaved()
  return 1
}
</script>