<template>
    <!-- StudentSubmitarea -->
    <div class="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-800">
        <!-- answer questionContent -->
        <div>
            <label class="text-xs text-gray-500 mb-1 block">{{ t('homework.contentLabel') }}</label>
            <richEditor v-model="submittedContent" />
        </div>

        <!-- File Upload -->
        <div>
            <label class="text-xs text-gray-500 mb-1 block">{{ t('homework.uploadLabel') }}</label>
            <FormInputFile v-model="submittedFiles" multiple :placeholder="t('homework.uploadHint')" />
        </div>

        <!-- Submit/Reset Button -->
        <div class="flex items-center gap-2">
            <span v-if="submitMsg" class="text-xs" :class="submitOk ? 'text-green-500' : 'text-red-500'">{{
                submitMsg
                }}</span>
            <div class="flex gap-2 ml-auto">
                <UButton variant="soft" size="sm" :disabled="submitting" @click="onReset">
                    {{ t('common.reset') }}
                </UButton>
                <UButton color="primary" size="sm" :loading="submitting"
                    :disabled="!submittedFiles || (Array.isArray(submittedFiles) && submittedFiles.length === 0)"
                    @click="onSubmit">
                    {{ submitted ? t('homework.resubmit') : t('homework.submit') }}
                </UButton>
            </div>
        </div>

        <!-- alreadySubmit Tip -->
        <div v-if="submitted"
            class="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md">
            <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-green-500" />
                <span class="text-sm text-green-700 dark:text-green-300">{{ t('homework.submit success') }}</span>
            </div>
            <!-- alreadySubmitContent -->
            <div v-if="submittedContent" class="mt-2">
                <ueditorRender v-if="isRichDoc(submittedContent)" :json="submittedContent" :course-id="effectiveCourseId" />
                <p v-else class="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{{ submittedContent }}</p>
            </div>
            <!-- alreadySubmitFile List -->
            <div v-if="submittedFileList && submittedFileList.length" class="mt-2 space-y-1">
                <div v-for="(url, idx) in submittedFileList" :key="idx" class="flex items-center gap-2">
                    <UIcon name="i-heroicons-document" class="w-4 h-4 text-gray-400" />
                    <a :href="url" target="_blank" class="text-xs text-blue-500 hover:underline truncate">{{ url
                        }}</a>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { useHomeworkRenderContext } from '../useHomeworkRender'

const {
    t, effectiveCourseId,
    submittedContent, submittedFiles, submitted, submittedFileList,
    submitting, submitMsg, submitOk,
    onSubmit, onReset, isRichDoc,
} = useHomeworkRenderContext()
</script>
