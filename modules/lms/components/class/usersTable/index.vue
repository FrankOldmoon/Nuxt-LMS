<template>
  <div>
    <div v-if="pending" class="flex items-center justify-center py-6 text-muted">
      <UIcon name="i-lucide-loader-2" class="animate-spin size-4 mr-2" />
      <span class="text-xs">{{ $t('classSelector.loading') }}</span>
    </div>

    <div v-else-if="!users.length" class="text-center py-6 text-muted text-xs">
      {{ $t('classSelector.noUsers') }}
    </div>

    <template v-else>
      <!-- 小组模式：Tab 切换学生/小组 -->
      <UTabs v-if="showGroup() && groupTableRows.length" v-model="activeTab" :items="tabItems" class="mb-3" />

      <ClassUsersTableStudentsTable>
        <template v-for="(_, name) in $slots" #[name]="slotData">
          <slot :name="name" v-bind="slotData" />
        </template>
      </ClassUsersTableStudentsTable>

      <ClassUsersTableGroups />
    </template>

    <!-- 用户编辑弹窗 -->
    <AuthUserEditModal v-if="!hideActions()" ref="editModal" :user-id="editingUserId"
      @saved="onEditSaved" />

    <!-- 重置密码弹窗 -->
    <ClassUsersTableResetModal />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  classId: number | null
  courseId?: number
  rows?: any[]
  extraColumns?: ExtraColumn[]
  hideActions?: boolean
  hideTeachers?: boolean
  hideNumber?: boolean
  /** 编号列是否可编辑（仅管理员/课程编辑者） */
  editableNumber?: boolean
  loading?: boolean
  defaultSort?: { id: string, desc: boolean }[]
  showChart?: boolean
  showOnline?: boolean
  /** 在线状态来源：'class'（默认，班级在线）| 'race'（竞赛在线） */
  onlineSource?: 'class' | 'race'
  showGroup?: boolean
  /** 前三名 name 右侧显示金银铜奖杯 */
  showMedal?: boolean
}>()

// 在 setup 阶段解析 UI 组件引用，传入 composable。
// 避免 composable 内部 resolveComponent 返回字符串导致 h() 渲染失败。
const UButton = resolveComponent('UButton')
const ctx = useClassUsersTable(props, { UButton })
provideClassUsersTable(ctx)

const {
  pending, users, showGroup, groupTableRows, activeTab, tabItems,
  editModal, editingUserId, hideActions, refresh,
} = ctx

function onEditSaved() {
  if (props.classId) {
    refresh()
  }
}

defineExpose({ refresh })
</script>
