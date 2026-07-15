<template>
    <UModal v-model:open="open" :ui="{ content: 'sm:max-w-3xl' }">
        <template #content>
            <div class="flex flex-col" style="height: 80vh;">
                <ContentPickerHeader />
                <ContentPickerPreviewArea />
                <ContentPickerFooter />
            </div>
            <!-- Edit Modal -->
            <QuestionEdit v-if="editType === 'question'" v-model="editOpen" :question-id="editId" :question="editData" @saved="onEditSaved" />
            <HomeworkEdit v-if="editType === 'homework'" v-model="editOpen" :homework-id="editId" :homework="editData" @saved="onEditSaved" />
            <CommentEdit v-if="editType === 'comment'" v-model="editOpen" :comment-id="editId" :comment="editData" @saved="onEditSaved" />
            <QuizEdit v-if="editType === 'quiz'" v-model="editOpen" :quiz-id="editId" :quiz="editData" @saved="onEditSaved" />
            <component v-if="moduleLms && editType === 'race' && RaceEdit" :is="RaceEdit" v-model="editOpen" :race-id="editId" :race="editData" @saved="onEditSaved" />
            <!-- ImportModal -->
            <ContentPickerImportModal />
        </template>
    </UModal>
</template>

<script setup>
import QuestionEdit from './extensions/nodes/vue/question/edit.vue'
import HomeworkEdit from './extensions/nodes/vue/homework/edit.vue'
import CommentEdit from './extensions/nodes/vue/comment/edit.vue'
import QuizEdit from './extensions/nodes/vue/quiz/edit.vue'
import RaceEdit from './extensions/nodes/vue/race/edit.vue'
import { useContentPicker } from './contentPicker/useContentPicker.js'
import ContentPickerHeader from './contentPicker/header.vue'
import ContentPickerPreviewArea from './contentPicker/previewArea.vue'
import ContentPickerFooter from './contentPicker/footer.vue'
import ContentPickerImportModal from './contentPicker/importModal.vue'

const props = defineProps({
    modelValue: { type: Boolean, default: false },
    type: { type: String, default: 'questions' },
    initialSelected: { type: Array, default: () => [] },
    previewMode: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'confirm'])
const { open, moduleLms, editType, editOpen, editId, editData, onEditSaved } = useContentPicker(props, emit)
</script>
