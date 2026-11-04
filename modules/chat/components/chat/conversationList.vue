<template>
  <aside class="h-full w-[264px] shrink-0 flex flex-col bg-elevated/40 border-r border-default">
    <!-- 新建 -->
    <div class="p-2.5 shrink-0">
      <UButton
        block
        color="primary"
        variant="soft"
        icon="i-lucide-plus"
        @click="emit('create')"
      >
        {{ $t('chat.newChat') }}
      </UButton>
    </div>

    <!-- 搜索 -->
    <div class="px-2.5 pb-2 shrink-0">
      <UInput
        v-model="keyword"
        icon="i-lucide-search"
        size="sm"
        :placeholder="$t('chat.searchPlaceholder')"
        class="w-full"
      >
        <template v-if="keyword" #trailing>
          <UButton icon="i-lucide-x" color="neutral" variant="link" size="xs" @click="keyword = ''" />
        </template>
      </UInput>
    </div>

    <!-- 列表 -->
    <div class="flex-1 min-h-0 overflow-y-auto px-1.5 pb-2">
      <div v-if="!filtered.length" class="px-3 py-8 text-center text-xs text-muted leading-relaxed">
        {{ conversations.length ? $t('chat.empty') : $t('chat.emptyHint') }}
      </div>

      <div
        v-for="c in filtered"
        :key="c.id"
        class="group relative rounded-md px-2 py-1.5 mb-0.5 cursor-pointer transition-colors"
        :class="c.id === currentId
          ? 'bg-primary/10 text-highlighted'
          : 'hover:bg-elevated text-toned'"
        @click="emit('select', c)"
      >
        <div class="flex items-center gap-1.5">
          <UIcon v-if="c.pinned" name="i-lucide-pin" class="size-3 text-primary shrink-0" />
          <span class="truncate text-[13px] leading-5">{{ c.title || $t('chat.untitled') }}</span>
        </div>
        <div class="text-[11px] text-dimmed truncate mt-0.5 flex items-center gap-1.5">
          <span>{{ formatTime(c.lastMessageAt) }}</span>
          <span v-if="c.messageCount" class="opacity-60">· {{ c.messageCount }}</span>
        </div>

        <!-- 操作（hover 显示） -->
        <UDropdownMenu
          :items="menuItems(c)"
          :content="{ align: 'end' }"
          class="absolute right-1 top-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
          @click.stop
        >
          <UButton
            icon="i-lucide-ellipsis-vertical"
            color="neutral"
            variant="ghost"
            size="xs"
            @click.stop
          />
        </UDropdownMenu>
      </div>
    </div>

    <!-- 重命名弹窗 -->
    <UModal v-model:open="renameOpen" :title="$t('chat.renameTitle')">
      <template #body>
        <UInput v-model="renameDraft" :placeholder="$t('chat.untitled')" autofocus
          @keydown.enter="confirmRename" />
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="ghost" @click="renameOpen = false">{{ $t('chat.cancel') }}</UButton>
          <UButton color="primary" :disabled="!renameDraft.trim()" @click="confirmRename">{{ $t('chat.save') }}</UButton>
        </div>
      </template>
    </UModal>
  </aside>
</template>

<script setup lang="ts">
interface Conversation {
  id: number
  title: string
  pinned?: boolean
  messageCount?: number
  lastMessageAt?: string | Date
}

const props = defineProps<{
  conversations: Conversation[]
  currentId?: number
}>()

const emit = defineEmits<{
  create: []
  select: [c: Conversation]
  rename: [c: Conversation, title: string]
  delete: [c: Conversation]
  pin: [c: Conversation, pinned: boolean]
}>()

const keyword = ref('')
const { t } = useI18n()
const filtered = computed(() => {
  const k = keyword.value.trim().toLowerCase()
  if (!k) return props.conversations
  return props.conversations.filter((c) => (c.title || '').toLowerCase().includes(k))
})

// ============ 时间显示 ============
function formatTime(v?: string | Date) {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  const now = Date.now()
  const diff = now - d.getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`
  const sameDay = new Date(now).toDateString() === d.toDateString()
  if (sameDay) return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  const md = `${d.getMonth() + 1}/${d.getDate()}`
  return d.getFullYear() === new Date(now).getFullYear() ? md : `${d.getFullYear()}/${md}`
}

// ============ 操作菜单 ============
function menuItems(c: Conversation) {
  return [
    [{
      label: t('chat.rename'),
      icon: 'i-lucide-pencil',
      onSelect: () => openRename(c),
    }, {
      label: c.pinned ? t('chat.unpin') : t('chat.pin'),
      icon: c.pinned ? 'i-lucide-pin-off' : 'i-lucide-pin',
      onSelect: () => emit('pin', c, !c.pinned),
    }],
    [{
      label: t('chat.delete'),
      icon: 'i-lucide-trash-2',
      color: 'error' as const,
      onSelect: () => emit('delete', c),
    }],
  ]
}

// ============ 重命名 ============
const renameOpen = ref(false)
const renameDraft = ref('')
let renameTarget: Conversation | null = null

function openRename(c: Conversation) {
  renameTarget = c
  renameDraft.value = c.title || ''
  renameOpen.value = true
}

function confirmRename() {
  const title = renameDraft.value.trim()
  if (!title || !renameTarget) return
  emit('rename', renameTarget, title)
  renameOpen.value = false
}
</script>
