<template>
    <div class="space-y-3">
        <!-- 发表评论 -->
        <div v-if="isLoggedIn" class="flex gap-2">
            <UTextarea v-model="text" :placeholder="$t('showcase.commentPlaceholder')" rows="2" class="flex-1" />
            <UButton :disabled="!text.trim()" variant="soft" color="primary" :loading="submitting"
                @click="submitComment"> {{ $t('showcase.reply') }}</UButton>
        </div>

        <div v-if="loading" class="text-center text-muted py-4">{{ $t('common.loading') }}</div>
        <p v-else-if="!comments.length" class="text-center text-muted py-4">{{ $t('showcase.noComments') }}</p>

        <div v-else class="space-y-3">
            <div v-for="c in comments" :key="c.id" class="space-y-2">
                <CommentItem :comment="c" :current-user-id="currentUserId"
                    @reply="startReply" @delete="delComment" />
                <div v-if="c.children && c.children.length" class="ml-10 space-y-2">
                    <CommentItem v-for="child in c.children" :key="child.id" :comment="child"
                        :current-user-id="currentUserId" @reply="startReply" @delete="delComment" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { onMounted } from 'vue'
import CommentItem from './commentItem.vue'

const props = defineProps({
    showcaseId: { type: [Number, String], required: true },
    currentUserId: { type: Number, default: null },
})

const { user } = useAuth()
const { t } = useI18n()
const toast = useToast()

const isLoggedIn = computed(() => !!user.value)
const comments = ref([])
const loading = ref(false)
const submitting = ref(false)
const text = ref('')
const replyingTo = ref(null)

async function load() {
    if (!props.showcaseId) return
    loading.value = true
    try {
        const data = await cRequest(`/api/showcase/comments?id=${props.showcaseId}`)
        comments.value = data || []
    } catch { comments.value = [] } finally { loading.value = false }
}

function buildDoc(txt) {
    return {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: txt }] }],
    }
}

async function submitComment() {
    const txt = text.value.trim()
    if (!txt) return
    submitting.value = true
    try {
        const result = await cRequest('/api/showcase/comment', {
            method: 'POST',
            body: {
                showcase_id: Number(props.showcaseId),
                content: buildDoc(txt),
                parent_id: replyingTo.value ?? 0,
            },
        })
        // 插入到对应层级
        const node = { ...result, children: result.children || [] }
        if (node.parentId) {
            const parent = comments.value.find(c => c.id === node.parentId)
            if (parent) (parent.children ||= []).push(node)
        } else {
            comments.value.unshift(node)
        }
        text.value = ''
        replyingTo.value = null
    } catch (e) {
        toast.add({ title: t('showcase.commentEmpty'), description: e?.message, color: 'error' })
    } finally {
        submitting.value = false
    }
}

function startReply(c) {
    replyingTo.value = c.id
    if (import.meta.client) {
        const el = document.querySelector(`[data-reply-target="${c.id}"]`)
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
}

async function delComment(c) {
    try {
        await cRequest('/api/showcase/comment/delete', { method: 'POST', body: { id: c.id } })
        // 简单从树中删除
        const remove = (list) => {
            const i = list.findIndex(x => x.id === c.id)
            if (i >= 0) { list.splice(i, 1); return true }
            for (const x of list) if (x.children && remove(x.children)) return true
            return false
        }
        remove(comments.value)
    } catch { /* silent */ }
}

onMounted(load)
</script>