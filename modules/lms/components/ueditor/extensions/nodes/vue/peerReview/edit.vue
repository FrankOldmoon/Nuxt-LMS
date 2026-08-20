<template>
    <div v-if="loading" class="p-6 text-center text-sm text-muted">{{ t('common.loading') }}</div>
    <div v-else class="p-6 space-y-4">
        <h2 class="text-lg font-semibold">
            {{ t('common.edit') }} - {{ form.name || t('peerReview.label') }}
        </h2>

        <UFormField :label="t('peerReview.name')">
            <UInput v-model="form.name" class="w-full" :placeholder="t('peerReview.namePlaceholder')" />
        </UFormField>

        <div>
            <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium">{{ t('peerReview.options') }}</span>
                <UButton icon="i-lucide-plus" color="primary" variant="soft" size="2xs" :label="t('peerReview.addOption')" @click="addOption" />
            </div>
            <div class="space-y-2">
                <div v-for="(opt, i) in form.options" :key="opt.key" class="flex items-center gap-2">
                    <UInput v-model="opt.label" class="flex-1" :placeholder="t('peerReview.optionLabel')" />
                    <span class="text-xs text-muted whitespace-nowrap">{{ t('peerReview.maxScore') }}</span>
                    <UInput v-model.number="opt.maxScore" type="number" min="1" class="w-20" />
                    <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="xs" @click="removeOption(i)" />
                </div>
            </div>
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t border-default/50">
            <span v-if="saveMsg" class="text-xs self-center" :class="saveOk ? 'text-green-500' : 'text-red-500'">{{ saveMsg }}</span>
            <UButton variant="soft" @click="resetForm">{{ t('common.reset') }}</UButton>
            <UButton color="primary" :loading="saving" @click="save">{{ t('common.save') }}</UButton>
        </div>
    </div>
</template>

<script setup>
import { usePeerReviewEdit } from './usePeerReviewEdit'

const props = defineProps({
    cid: { type: Number, default: 0 },
    courseId: { type: [Number, String], default: undefined },
})
const emit = defineEmits(['saved'])

const { t } = useI18n()
const {
    loading, saving, saveMsg, saveOk, form,
    addOption, removeOption, resetForm, save,
} = usePeerReviewEdit(props, emit)

// 初次进入：新建给一行空选项，编辑则加载配置
resetForm()
</script>
