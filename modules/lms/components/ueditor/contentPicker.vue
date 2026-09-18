<template>
    <UModal v-model:open="open" :ui="{ content: 'sm:max-w-3xl' }">
        <template #content>
            <div class="flex flex-col" style="height: 80vh;">
                <ContentPickerHeader />
                <ContentPickerPreviewArea />
                <ContentPickerFooter />
            </div>
            <!-- 编辑弹窗 -->
            <QuestionEdit v-if="editType === 'question'" v-model="editOpen" :question-id="editId" :question="editData" @saved="onEditSaved" />
            <HomeworkEdit v-if="editType === 'homework'" v-model="editOpen" :homework-id="editId" :homework="editData" @saved="onEditSaved" />
            <CommentEdit v-if="editType === 'comment'" v-model="editOpen" :comment-id="editId" :comment="editData" @saved="onEditSaved" />
            <QuizEdit v-if="editType === 'quiz'" v-model="editOpen" :quiz-id="editId" :quiz="editData" @saved="onEditSaved" />
            <component v-if="moduleLms && editType === 'race' && RaceEdit" :is="RaceEdit" v-model="editOpen" :race-id="editId" :race="editData" @saved="onEditSaved" />
            <!-- 导入弹窗 -->
            <ContentPickerImportModal />
        </template>
    </UModal>
</template>

<script setup>
import { defineAsyncComponent } from 'vue'
import { useContentPicker } from './contentPicker/useContentPicker.js'
import ContentPickerHeader from './contentPicker/header.vue'
import ContentPickerPreviewArea from './contentPicker/previewArea.vue'
import ContentPickerFooter from './contentPicker/footer.vue'

/*
 * ⚠️ 性能：以下组件必须动态导入（defineAsyncComponent），不能静态 import。
 *
 * 这些节点编辑器会牵出 RichEditor → tiptap/ProseMirror，导入弹窗会牵出 xlsx/docx 等
 * 导入导出依赖；而本组件被全站侧边栏 <LazyUeditorContentPicker> 引用。
 * 一旦静态 import，整棵依赖树会随「布局 chunk」进入首屏阻塞路径（实测导致 4 MB
 * 公共 chunk 被 modulepreload）。动态导入后，只有用户真正点「编辑」/「导入」时才下载。
 */
const QuestionEdit = defineAsyncComponent(() => import('./extensions/nodes/vue/question/edit.vue'))
const HomeworkEdit = defineAsyncComponent(() => import('./extensions/nodes/vue/homework/edit.vue'))
const CommentEdit = defineAsyncComponent(() => import('./extensions/nodes/vue/comment/edit.vue'))
const QuizEdit = defineAsyncComponent(() => import('./extensions/nodes/vue/quiz/edit.vue'))
const RaceEdit = defineAsyncComponent(() => import('./extensions/nodes/vue/race/edit.vue'))
const ContentPickerImportModal = defineAsyncComponent(() => import('./contentPicker/importModal.vue'))

const props = defineProps({
    modelValue: { type: Boolean, default: false },
    type: { type: String, default: 'questions' },
    initialSelected: { type: Array, default: () => [] },
    previewMode: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'confirm'])
const { open, moduleLms, editType, editOpen, editId, editData, onEditSaved } = useContentPicker(props, emit)
</script>
