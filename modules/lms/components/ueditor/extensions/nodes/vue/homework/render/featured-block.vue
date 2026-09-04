<template>
    <!-- 优秀作业区块（本班被教师标优的作业，全班可见） -->
    <div v-if="featuredList.length" class="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
        <div class="flex items-center gap-1 text-sm font-semibold text-amber-500">
            <UIcon name="i-heroicons-star" class="w-4 h-4" />
            {{ t('homework.featuredTitle') }}
        </div>

        <div v-for="(item, idx) in featuredList" :key="idx"
            class="p-3 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700 rounded-lg">
            <!-- 作者 + 得分 -->
            <div class="flex items-center gap-2 mb-1">
                <AuthUserCard :user="userOf(item)" />
                <div v-if="item.score !== null && item.score !== undefined" class="ml-auto text-xs">
                    <span class="text-gray-500">{{ t('record.score') }}: </span>
                    <span class="font-semibold text-green-600">{{ item.score }}</span>
                </div>
            </div>

            <!-- 作答内容 -->
            <div v-if="item.content" class="prose prose-sm dark:prose-invert max-w-none">
                <ueditorRender v-if="isRichDoc(item.content)" :json="item.content" :course-id="effectiveCourseId" />
                <p v-else class="text-xs whitespace-pre-wrap">{{ item.content }}</p>
            </div>

            <!-- 文件 -->
            <div v-if="item.files && item.files.length" class="mt-1 space-y-1">
                <div v-for="(url, i) in item.files" :key="i" class="flex items-center gap-2">
                    <UIcon name="i-heroicons-document" class="w-4 h-4 text-gray-400" />
                    <a :href="url" target="_blank" class="text-xs text-blue-500 hover:underline truncate">{{ url }}</a>
                </div>
            </div>

            <!-- 评语 -->
            <p v-if="strFromComment(item.comment)" class="mt-2 text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                {{ strFromComment(item.comment) }}
            </p>
        </div>
    </div>
</template>

<script setup>
import { useHomeworkRenderContext } from '../useHomeworkRender'

const { t, effectiveCourseId, featuredList, isRichDoc, strFromComment } = useHomeworkRenderContext()

function userOf(item) {
    return {
        id: item.userId,
        name: item.preferName || item.userName || 'U',
        preferName: item.userName || null,
        avatarImg: item.avatarImg || null,
    }
}
</script>