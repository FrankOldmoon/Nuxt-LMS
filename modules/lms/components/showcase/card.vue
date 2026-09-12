<template>
    <NuxtLink :to="`/showcase/${work.id}`" class="group block h-full relative">
        <UCard :ui="{ body: 'p-0', root: 'overflow-hidden rounded-xl h-full', shadow: 'shadow-sm group-hover:shadow-md transition-shadow' }">
            <div class="aspect-video w-full bg-elevated overflow-hidden">
                <img v-if="work.cover" :src="work.cover" :alt="work.title"
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div v-else class="w-full h-full flex items-center justify-center text-muted">
                    <UIcon name="i-heroicons-square-3-stack-3d" class="size-8" />
                </div>
            </div>
            <div class="p-4">
                <div class="flex items-center justify-between gap-2 mb-1">
                    <span v-if="work.category" class="text-xs text-primary">{{ categoryLabel }}</span>
                    <span v-if="showStatus" class="text-xs px-2 py-0.5 rounded" :class="statusClass">{{ statusLabel }}</span>
                </div>
                <h3 class="font-semibold leading-tight truncate group-hover:text-primary transition-colors">{{ work.title }}</h3>
                <div v-if="isArray(work.tags) && work.tags.length" class="flex flex-wrap gap-1 mt-1">
                    <span v-for="tg in work.tags.slice(0, 2)" :key="tg" class="text-[10px] bg-primary/10 text-primary rounded px-1.5 py-0.5">#{{ tg }}</span>
                    <span v-if="work.tags.length > 2" class="text-[10px] text-muted">+{{ work.tags.length - 2 }}</span>
                </div>
                <div class="flex items-center justify-between mt-2 text-xs text-muted">
                    <span class="flex items-center gap-1.5 min-w-0">
                        <AvatarWithFrame :src="work.avatarImg || undefined" :alt="work.userName || '?'" :text="(work.userName || '?').charAt(0)" size="xs" :frame="work.avatarFrame || null" :userId="work.userId" />
                        <span class="truncate">{{ work.userName || '…' }}</span>
                    </span>
                    <span class="flex items-center gap-1 shrink-0">
                        <UIcon name="i-heroicons-heart" class="size-3.5 text-red-400" />
                        {{ work.likeCount ?? 0 }}
                    </span>
                </div>
            </div>
        </UCard>

        <!-- 管理员/老师可见的编辑按钮（卡片右上角） -->
        <UButton v-if="canEdit" size="xs" square variant="soft" icon="i-heroicons-pencil-square"
            class="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity"
            :aria-label="t('showcase.edit')" @click.prevent.stop="$emit('edit', work)" />
    </NuxtLink>
</template>

<script setup>
const props = defineProps({
    work: { type: Object, required: true },
    canEdit: { type: Boolean, default: false },
})
const emit = defineEmits(['edit'])

const { t } = useI18n()

const categoryLabel = computed(() => props.work.category === 'hardware' ? t('showcase.hardware') : t('showcase.software'))
function isArray(v) { return Array.isArray(v) }

const showStatus = computed(() => !!props.work.status && props.work.status !== 'approved')
const statusLabel = computed(() => {
    const map = { pending: t('showcase.pending'), rejected: t('showcase.rejected') }
    return map[props.work.status] || props.work.status
})
const statusClass = computed(() =>
    props.work.status === 'pending'
        ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
        : 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
)
</script>