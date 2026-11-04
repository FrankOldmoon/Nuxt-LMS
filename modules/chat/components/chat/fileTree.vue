<template>
  <div class="h-full flex flex-col min-h-0">
    <!-- 头部 -->
    <div class="h-11 shrink-0 flex items-center gap-2 px-3 border-b border-default">
      <UIcon name="i-lucide-folder-tree" class="size-4 text-muted shrink-0" />
      <span class="text-sm font-medium shrink-0">{{ $t('chat.files') }}</span>
      <UBadge v-if="files.length" color="neutral" variant="soft" size="sm">{{ files.length }}</UBadge>
      <div class="ml-auto flex items-center gap-1">
        <UTooltip :text="$t('chat.refresh')">
          <UButton icon="i-lucide-refresh-cw" color="neutral" variant="ghost" size="xs"
            :loading="loading" @click="load" />
        </UTooltip>
      </div>
    </div>

    <!-- 空 -->
    <div v-if="!files.length && !loading" class="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center">
      <UIcon name="i-lucide-folder-open" class="size-10 text-dimmed" />
      <p class="text-sm text-muted">{{ $t('chat.filesEmpty') }}</p>
      <p class="text-xs text-dimmed">{{ $t('chat.filesEmptyHint') }}</p>
    </div>

    <!-- 列表 -->
    <div v-else class="flex-1 min-h-0 overflow-y-auto p-1.5">
      <div
        v-for="f in files"
        :key="f.path"
        class="group rounded-md px-2 py-1.5 cursor-pointer transition-colors"
        :class="active === f.path ? 'bg-primary/10' : 'hover:bg-elevated'"
        @click="open(f)"
      >
        <div class="flex items-center gap-1.5">
          <UIcon :name="iconOf(f.path)" class="size-3.5 shrink-0 text-muted" />
          <span class="truncate flex-1 text-[13px] leading-5 text-toned">{{ f.path }}</span>
          <div class="hidden group-hover:flex items-center gap-0.5 shrink-0">
            <UButton :to="downloadUrl(f.path)" target="_blank" icon="i-lucide-download"
              color="neutral" variant="ghost" size="xs" @click.stop />
            <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="xs"
              @click.stop="remove(f)" />
          </div>
        </div>
        <div class="text-[11px] text-dimmed mt-0.5 pl-5 flex items-center gap-1.5">
          <span>{{ sizeText(f.size) }}</span>
          <span class="opacity-60">·</span>
          <span>{{ timeText(f.updatedAt) }}</span>
        </div>
      </div>
    </div>

    <!-- 预览弹窗 -->
    <UModal v-model:open="previewOpen" :ui="{ content: 'max-w-4xl' }">
      <template #content>
        <div class="flex flex-col max-h-[85vh]">
          <div class="h-11 shrink-0 flex items-center gap-2 px-4 border-b border-default">
            <UIcon :name="iconOf(preview?.path || '')" class="size-4 text-muted" />
            <span class="text-sm font-medium truncate">{{ preview?.path }}</span>
            <span class="text-xs text-dimmed">{{ sizeText(preview?.size) }}</span>
            <div class="ml-auto flex items-center gap-1">
              <UButton :to="downloadUrl(preview?.path || '')" target="_blank" icon="i-lucide-download"
                color="neutral" variant="ghost" size="sm" :label="$t('common.download')" />
              <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="previewOpen = false" />
            </div>
          </div>
          <div class="flex-1 min-h-0 overflow-auto">
            <iframe
              v-if="isHtmlFile"
              :srcdoc="preview?.content || ''"
              class="w-full h-[70vh] border-0 bg-white"
              sandbox="allow-scripts allow-forms allow-modals allow-popups"
            />
            <!-- 其余类型交给项目通用的文件预览器：图片 / pdf / 视频 / 3D / office / zip / 文本 -->
            <UeditorFilePreview
              v-else-if="preview"
              :url="inlineUrl(preview.path)"
              :name="preview.path"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
// 通用文件预览器（图片/pdf/视频/3D/office/zip/文本）没有自动注册，需显式引入
import UeditorFilePreview from '../../../lms/components/ueditor/render/nodes/file-preview.vue'

interface WorkspaceFile {
  path: string
  size: number
  mime?: string | null
  updatedAt?: string | Date
}

const props = defineProps<{
  conversationId: number
}>()

const emit = defineEmits<{
  select: [file: WorkspaceFile]
}>()

const { t } = useI18n()
const toast = useToast()

const files = ref<WorkspaceFile[]>([])
const loading = ref(false)
const active = ref('')

// 预览
const previewOpen = ref(false)
const preview = ref<{ path: string; content: string; size?: number } | null>(null)
const isHtmlFile = computed(() => /\.html?$/i.test(preview.value?.path || ''))

async function load() {
  if (!props.conversationId) {
    files.value = []
    return
  }
  loading.value = true
  try {
    const rows = await cRequest<WorkspaceFile[]>(`/api/chat/workspace/files?conversation_id=${props.conversationId}`)
    files.value = rows || []
  } catch (e: any) {
    console.warn('[chat] load files failed', e)
  } finally {
    loading.value = false
  }
}

async function open(f: WorkspaceFile) {
  active.value = f.path
  try {
    const row = await cRequest<any>(`/api/chat/workspace/file?conversation_id=${props.conversationId}&path=${encodeURIComponent(f.path)}`)
    preview.value = { path: f.path, content: row?.content ?? '', size: f.size }
    previewOpen.value = true
    emit('select', preview.value as any)
  } catch (e: any) {
    toast.add({ title: t('chat.loadFailed'), description: e?.message, color: 'error' })
  }
}

async function remove(f: WorkspaceFile) {
  try {
    await cRequest('/api/chat/workspace/file/delete', {
      method: 'POST',
      body: { conversation_id: props.conversationId, path: f.path },
    })
    files.value = files.value.filter((x) => x.path !== f.path)
    if (active.value === f.path) active.value = ''
  } catch (e: any) {
    toast.add({ title: t('chat.deleteFailed'), description: e?.message, color: 'error' })
  }
}

function downloadUrl(path: string) {
  return `/api/chat/workspace/download?conversation_id=${props.conversationId}&path=${encodeURIComponent(path)}`
}

/** 预览用的内联 URL：不带就会触发强制下载，img/iframe/3D loader 都拿不到内容 */
function inlineUrl(path: string) {
  return `${downloadUrl(path)}&inline=1`
}

function iconOf(path: string) {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  if (['py'].includes(ext)) return 'i-lucide-file-code'
  if (['js', 'mjs', 'ts', 'java', 'cpp', 'c', 'sql', 'sh'].includes(ext)) return 'i-lucide-file-code-2'
  if (['json', 'yml', 'yaml'].includes(ext)) return 'i-lucide-braces'
  if (['csv', 'tsv'].includes(ext)) return 'i-lucide-table'
  if (['md', 'txt', 'log'].includes(ext)) return 'i-lucide-file-text'
  if (['html', 'htm'].includes(ext)) return 'i-lucide-globe'
  if (['svg', 'png', 'jpg'].includes(ext)) return 'i-lucide-image'
  return 'i-lucide-file'
}

function sizeText(n?: number) {
  const v = Number(n) || 0
  if (v < 1024) return `${v} B`
  return `${(v / 1024).toFixed(1)} KB`
}

function timeText(v?: string | Date) {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  const diff = Date.now() - d.getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`
  return `${d.getMonth() + 1}/${d.getDate()}`
}

watch(() => props.conversationId, load, { immediate: true })

defineExpose({ load })
</script>
