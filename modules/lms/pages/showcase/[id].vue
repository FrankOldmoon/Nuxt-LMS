<template>
    <div class="mx-auto max-w-3xl px-4 py-6">
        <UButton variant="ghost" size="sm" icon="i-heroicons-arrow-left" @click="router.back()">
            {{ $t('showcase.back') }}
        </UButton>

        <div v-if="loading" class="py-16 text-center text-muted">{{ $t('common.loading') }}</div>

        <div v-else-if="!work" class="py-16 text-center text-muted">{{ $t('showcase.notFound') }}</div>

        <template v-else>
            <!-- 头部 -->
            <div class="mt-3">
                <div class="flex items-center gap-2 mb-2">
                    <span class="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">{{ categoryLabel }}</span>
                    <span v-if="work.status !== 'approved'" class="text-xs px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">{{ statusLabel }}</span>
                </div>
                <h1 class="text-2xl font-bold">{{ work.title }}</h1>

                <!-- 标签 -->
                <div v-if="isArray(work.tags) && work.tags.length" class="flex flex-wrap gap-1.5 mt-2">
                    <span v-for="tg in work.tags" :key="tg" class="text-xs bg-primary/10 text-primary rounded px-2 py-0.5">#{{ tg }}</span>
                </div>

                <div class="flex items-center justify-between gap-3 mt-3 flex-wrap">
                    <div class="flex items-center gap-2 text-sm text-muted">
                        <AvatarWithFrame :src="work.avatarImg || undefined" :text="(work.userName || '?').charAt(0)" size="sm" :frame="work.avatarFrame || null" :userId="work.userId" />
                        <span>{{ work.userName || '…' }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <!-- 点赞 -->
                        <UButton v-if="isLoggedIn" size="sm" :variant="work.liked ? 'solid' : 'soft'"
                            :color="work.liked ? 'error' : 'neutral'" :icon="work.liked ? 'i-heroicons-heart-solid' : 'i-heroicons-heart'"
                            @click="toggleLike">
                            {{ work.likeCount ?? 0 }}
                        </UButton>
                        <span v-else class="flex items-center gap-1 text-sm text-muted">
                            <UIcon name="i-heroicons-heart" class="size-4 text-red-400" /> {{ work.likeCount ?? 0 }}
                        </span>
                        <!-- 编辑/删除（作者 或 管理员/老师） -->
                        <template v-if="canEdit">
                            <UButton size="sm" variant="soft" @click="editId = work.id; editOpen = true">{{ $t('showcase.edit') }}</UButton>
                            <UButton size="sm" color="error" variant="ghost" @click="del">{{ $t('showcase.delete') }}</UButton>
                        </template>
                        <!-- 审批（老师/管理员） -->
                        <template v-if="isStaff">
                            <UButton size="sm" color="success" variant="soft" :disabled="work.status==='approved'" @click="approve">
                                {{ $t('showcase.approve') }}
                            </UButton>
                            <UButton size="sm" color="error" variant="soft" :disabled="work.status==='rejected'" @click="reject">
                                {{ $t('showcase.reject') }}
                            </UButton>
                        </template>
                    </div>
                </div>
            </div>

            <!-- 封面 -->
            <div v-if="work.cover" class="mt-5 rounded-xl overflow-hidden">
                <img :src="work.cover" class="w-full max-h-96 object-cover" />
            </div>

            <!-- 富文本内容（内含内嵌文件/图片） -->
            <div v-if="hasContent" class="mt-6 prose prose-lg dark:prose-invert max-w-none">
                <ueditor-render :json="work.content" />
            </div>

            <!-- 评论 -->
            <div class="mt-10">
                <h3 class="text-base font-semibold mb-3">{{ $t('showcase.comments') }}</h3>
                <ShowcaseCommentList :showcase-id="id" :current-user-id="user?.id" />
            </div>
        </template>

        <ShowcaseEditModal v-model:open="editOpen" :id="editId" @saved="reload" />
    </div>
</template>

<script setup>
const route = useRoute()
const router = useRouter()
const { user, hasRole } = useAuth()
const { t } = useI18n()
const toast = useToast()

const id = computed(() => Number(route.params.id) || 0)
const work = ref(null)
const loading = ref(true)
const editOpen = ref(false)
const editId = ref(0)

const isLoggedIn = computed(() => !!user.value)
const isStaff = computed(() => hasRole('admin') || hasRole('teacher'))
const isOwner = computed(() => !!user.value && work.value && work.value.userId === user.value.id)
const canEdit = computed(() => isOwner.value || isStaff.value)
const hasContent = computed(() => !!work.value?.content && Object.keys(work.value.content || {}).length > 0)
const categoryLabel = computed(() => work.value?.category === 'hardware' ? t('showcase.hardware') : t('showcase.software'))
const statusLabel = computed(() => ({ pending: t('showcase.pending'), rejected: t('showcase.rejected') }[work.value?.status] || work.value?.status))

function isArray(v) { return Array.isArray(v) }

async function load() {
    loading.value = true
    try {
        work.value = await cRequest(`/api/showcase/show?id=${id.value}`)
    } catch {
        work.value = null
    } finally {
        loading.value = false
    }
}
function reload() { load() }

async function toggleLike() {
    if (!work.value) return
    const liked = !work.value.liked
    work.value = { ...work.value, liked, likeCount: Math.max(0, (work.value.likeCount || 0) + (liked ? 1 : -1)) }
    try {
        await cRequest('/api/showcase/like', { method: 'POST', body: { showcase_id: id.value, like: liked } })
    } catch {
        work.value = { ...work.value, liked: !liked, likeCount: Math.max(0, (work.value.likeCount || 0) + (liked ? -1 : 1)) }
    }
}

async function del() {
    if (!confirm(t('showcase.confirmDelete'))) return
    try {
        await cRequest('/api/showcase/delete', { method: 'POST', body: { id: id.value } })
        router.push('/showcase')
    } catch { /* silent */ }
}

async function approve() {
    await cRequest('/api/showcase/approve', { method: 'POST', body: { id: id.value, status: 'approved' } })
    work.value = { ...work.value, status: 'approved' }
}
async function reject() {
    await cRequest('/api/showcase/approve', { method: 'POST', body: { id: id.value, status: 'rejected' } })
    work.value = { ...work.value, status: 'rejected' }
}

load()
</script>