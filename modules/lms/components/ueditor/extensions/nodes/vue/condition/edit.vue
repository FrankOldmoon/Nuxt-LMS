<template>
    <!-- itemsconditionList -->
    <div class="space-y-2">
        <div v-for="(cond, idx) in editConditions" :key="idx" class="flex items-center gap-2">
            <USelect v-model="cond.type" :items="conditionTypes" size="sm" class="w-32" />
            <USelect v-if="cond.type === 'role'" v-model="cond.value" :items="roleOptions" size="sm"
                class="flex-1" />
            <USelect v-else-if="cond.type === 'class'" v-model="cond.value" :items="classOptions" size="sm"
                class="flex-1" @update:model-value="updateClassLabel(idx, $event)" />
            <USelect v-else-if="cond.type === 'question'" v-model="cond.value" :items="questionOptions" multiple
                size="sm" class="flex-1" @update:model-value="updateTaskLabel(idx, $event, 'question')" />
            <USelect v-else-if="cond.type === 'homework'" v-model="cond.value" :items="homeworkOptions" multiple
                size="sm" class="flex-1" @update:model-value="updateTaskLabel(idx, $event, 'homework')" />
            <USelect v-else-if="cond.type === 'comment'" v-model="cond.value" :items="commentOptions" multiple
                size="sm" class="flex-1" @update:model-value="updateTaskLabel(idx, $event, 'comment')" />
            <USelect v-else-if="cond.type === 'quiz'" v-model="cond.value" :items="quizOptions" multiple
                size="sm" class="flex-1" @update:model-value="updateTaskLabel(idx, $event, 'quiz')" />
            <USelect v-else-if="cond.type === 'race'" v-model="cond.value" :items="raceOptions" multiple
                size="sm" class="flex-1" @update:model-value="updateTaskLabel(idx, $event, 'race')" />
            <UButton icon="i-lucide-x" color="error" variant="ghost" size="xs"
                @click="editConditions.splice(idx, 1)" />
        </div>
    </div>
    <UButton icon="i-lucide-plus" color="neutral" variant="outline" size="xs"
        :label="t('ueditor.conditionAdd')" @click="editConditions.push({ type: 'role', value: '' })" />
    <USeparator />
    <UFormField :label="t('ueditor.conditionContent')" size="sm">
        <RichEditor v-model="editContent" />
    </UFormField>
    <UButton size="xs" color="primary" @click="apply">{{ t('common.save') }}</UButton>
</template>

<script setup>
import { useConditionEdit } from './useConditionEdit'

const props = defineProps({
    config: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:config', 'close'])

const {
    t, editConditions, editContent, conditionTypes, roleOptions, classOptions,
    questionOptions, homeworkOptions, commentOptions, quizOptions, raceOptions,
    updateTaskLabel, updateClassLabel, apply,
} = useConditionEdit(props, emit)
</script>
