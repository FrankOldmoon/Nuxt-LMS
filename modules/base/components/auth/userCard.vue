<template>
    <div class="aspect-square flex flex-col items-center justify-center gap-0.5 rounded-lg cursor-pointer transition-all border-2 p-1 text-center select-none"
        :class="[cardSizeClass, selected
            ? 'bg-primary/15 border-primary ring-2 ring-primary/30 scale-[1.02]'
            : 'bg-muted/30 border-default hover:bg-muted/50']" @click="$emit('click')">
        <AvatarWithFrame :src="user.avatarImg || undefined" :alt="user.name" :text="user.name?.charAt(0)" :size="avatarSize"
          :frame="user.avatarFrame || null" :userId="user.id" />
        <span class="truncate w-full leading-tight" :class="textClass">
            {{ user.name || user.preferName }}
        </span>
        <span v-if="user.username" class="text-muted font-mono truncate w-full leading-tight" :class="subTextClass">
            {{ user.username }}
        </span>
        <slot />
    </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
    user: {
        id?: number
        name: string
        preferName?: string | null
        username?: string | null
        avatarImg?: string | null
        avatarFrame?: string | null
        rollNumber?: string | null
    }
    selected?: boolean
    size?: 'sm' | 'md' | 'lg'
}>(), {
    selected: false,
    size: 'sm',
})

defineEmits<{
    click: []
}>()

// 整体框尺寸：固定宽高 + aspect-square 保持正方形
const cardSizeClass = computed(() => {
    switch (props.size) {
        case 'sm': return 'w-20 h-20'
        case 'md': return 'w-28 h-28'
        case 'lg': return 'w-36 h-36'
        default: return 'w-20 h-20'
    }
})

const avatarSize = computed(() => {
    switch (props.size) {
        case 'sm': return 'sm'
        case 'md': return 'lg'
        case 'lg': return 'xl'
        default: return 'sm'
    }
})

const textClass = computed(() => {
    switch (props.size) {
        case 'sm': return 'text-[11px]'
        case 'md': return 'text-xs'
        case 'lg': return 'text-sm'
        default: return 'text-[11px]'
    }
})

const subTextClass = computed(() => {
    switch (props.size) {
        case 'sm': return 'text-[9px]'
        case 'md': return 'text-[10px]'
        case 'lg': return 'text-xs'
        default: return 'text-[9px]'
    }
})
</script>