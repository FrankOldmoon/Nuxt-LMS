<template>
  <UModal v-model:open="open" :ui="{ content: 'sm:max-w-5xl' }">
    <UTooltip :text="$t('courseEditor.editCourse')" :content="{ side: 'bottom' }">
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-lucide-settings"
        :disabled="!canEdit"
        :aria-label="$t('courseEditor.editCourse')"
        @click.prevent.stop="openModal"
      />
    </UTooltip>

    <template #content>
      <div class="p-6 max-h-[85vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold">{{ $t('courseEditor.title') }}</h3>
        </div>

        <div v-if="loading" class="flex items-center justify-center py-10 text-muted">
          <UIcon name="i-lucide-loader-2" class="animate-spin size-5 mr-2" />
          <span class="text-sm">{{ $t('courseEditor.loading') }}</span>
        </div>

        <div v-show="!loading" class="space-y-4">
          <UTabs v-model="activeTab" :items="tabItems" class="mb-2" />

          <!-- 课程内容编辑 + 封面图片 -->
          <div v-show="activeTab === 'content'">
            <!-- 封面图片上传 -->
            <UFormField :label="$t('courseEditor.coverImage')" class="w-full mb-4">
              <div class="flex items-center gap-3">
                <div v-if="coverImg" class="relative group">
                  <img :src="coverImg" class="w-32 h-20 object-cover rounded-lg border border-default" />
                  <button
                    class="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    @click="coverImg = ''"
                  >×</button>
                </div>
                <UButton
                  :icon="coverImg ? 'i-lucide-refresh-cw' : 'i-lucide-image-plus'"
                  variant="outline"
                  size="sm"
                  :loading="uploading"
                  @click="triggerCoverUpload"
                />
                <input ref="coverInputRef" type="file" accept="image/*" class="hidden" @change="onCoverFileSelected" />
              </div>
            </UFormField>

            <FormImageCropperModal
              ref="cropperRef"
              :title="$t('courseEditor.cropCover')"
              :aspect-ratio="16/10"
              stencil-type="rectangle"
              @uploaded="onCropped"
            />

            <richEditor v-model="contentJson" :lock-id="lockId" />
          </div>

          <!-- config 编辑（Display：基本信息 + 显示配置） -->
          <div v-show="activeTab === 'config'">
            <CourseEditorConfigForm ref="configFormRef" />
          </div>

          <!-- 学习行为配置（Learning Config） -->
          <div v-show="activeTab === 'learning'" class="space-y-3">
            <USeparator :label="$t('courseEditor.learningConfig')" class="my-4" />
            <div v-for="sw in courseSwitchList" :key="sw.key" class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium">{{ $t(sw.label) }}</p>
                <p class="text-xs text-muted">{{ $t(sw.hint) }}</p>
              </div>
              <USwitch v-model="courseSwitches[sw.key]" />
            </div>
          </div>

          <!-- 商品管理（教师/管理员可见） -->
          <div v-show="activeTab === 'goods' && canEdit" class="space-y-6">
            <!-- 课程专属商品管理（教师/管理员可见） -->
            <LmsGoodsEditor v-if="canEdit" :course-id="props.courseId" />
            <!-- 全局商品管理（仅管理员可见） -->
            <LmsGoodsEditor v-if="hasRole('admin')" :course-id="0" />
          </div>

          <!-- 底部按钮 -->
          <div class="flex justify-end gap-2 pt-4">
            <UButton :label="$t('common.cancel')" color="neutral" variant="ghost" @click="closeModal" />
            <UButton :label="$t('common.save')" color="primary" :loading="saving" @click="save" />
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  courseId: number
}>()

const emit = defineEmits<{
  (e: 'saved'): void
}>()

const { hasRole } = useAuth()

const { t } = useI18n()

const {
  open,
  loading,
  saving,
  canEdit,
  lockId,
  form,
  contentJson,
  configFormRef,
  openModal,
  closeModal,
  save,
} = useCourseEditor(props, emit)

// 提供配置表单上下文（content 封面图 + learning 开关 + Display 基本信息/其余项共享同一实例）
const {
  coverImg, uploading, coverInputRef, cropperRef,
  courseSwitches, courseSwitchList,
  triggerCoverUpload, onCoverFileSelected, onCropped,
} = provideCourseConfigForm(form)

type EditorTab = 'content' | 'config' | 'learning' | 'goods'
const activeTab = ref<EditorTab>('content')
const tabItems = computed(() => {
  const items: { label: string, value: EditorTab, icon: string }[] = [
    { label: t('courseEditor.tabContent'), value: 'content', icon: 'i-lucide-file-text' },
    { label: t('courseEditor.tabConfig'), value: 'config', icon: 'i-lucide-settings-2' },
  ]
  items.push({ label: t('courseEditor.tabLearning'), value: 'learning', icon: 'i-lucide-graduation-cap' })
  if (canEdit.value) {
    items.push({ label: t('courseEditor.tabGoods'), value: 'goods', icon: 'i-lucide-shopping-bag' })
  }
  return items
})
</script>
