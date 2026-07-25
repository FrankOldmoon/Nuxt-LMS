<template>
  <UModal v-model:open="open">
    <UTooltip :text="$t('navEditor.title')" :content="{ side: 'bottom' }">
      <UButton color="primary" variant="soft" size="xs" icon="i-lucide-list-tree" :aria-label="$t('navEditor.title')"
        @click="openModal" />
    </UTooltip>

    <template #content>
      <div class="p-6 space-y-4 min-w-[520px] max-h-[70vh] overflow-y-auto">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-medium">{{ mode === 'category' ? $t('navEditor.editCategory') :
            $t('navEditor.editCourse') }}</h3>
          <UButton size="sm" variant="outline" icon="i-lucide-file-plus" :label="$t('navEditor.batchImport')"
            @click="() => { importOpen = true }" />
        </div>
        <p class="text-sm text-gray-500">{{ $t('navEditor.hint') }}</p>

        <NavEditorList v-model="flatItems" :max-depth="maxDepth" :gen-key="genKey" />
      </div>

      <!-- 底部按钮 -->
      <div class="flex justify-between gap-2 p-4 border-t">
        <UButton color="neutral" variant="ghost" @click="cancel">
          {{ $t('common.cancel') }}
        </UButton>
        <div class="flex gap-2">
          <UButton color="neutral" variant="outline" @click="resetFromProps">
            {{ $t('common.reset') }}
          </UButton>
          <UButton color="primary" variant="solid" :loading="saving" @click="save">
            {{ $t('navEditor.saveAndClose') }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>

  <!-- 批量导入弹窗 -->
  <NavEditorImportModal
    v-model:open="importOpen"
    v-model:text="importText"
    v-model:prompt="aiPrompt"
    :generating="aiGenerating"
    @generate="aiGenerate"
    @confirm="doBatchImport"
  />
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import NavEditorList from './list.vue'
import NavEditorImportModal from './importModal.vue'

type EditorMode = 'category' | 'course'

const props = defineProps<{
  mode: EditorMode
  courseId?: string
  navigation: NavigationMenuItem[]
}>()

const emit = defineEmits<{
  (e: 'saved'): void
}>()

const {
  open, flatItems, saving, maxDepth, genKey,
  importOpen, importText, aiPrompt, aiGenerating,
  resetFromProps, doBatchImport, aiGenerate,
  openModal, cancel, save,
} = useNavEditor(props, emit)
</script>
