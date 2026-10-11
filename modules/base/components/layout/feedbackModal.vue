<template>
  <UModal v-model:open="isOpen" :ui="{ content: 'sm:max-w-3xl' }" scrollable>
    <template #content>
      <div class="p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold">{{ $t('feedback.title') }}</h3>
        </div>

        <!-- 管理员：只读分页列表（无新增表单） -->
        <div v-if="isAdmin" class="space-y-3">
          <div class="space-y-2 max-h-[55vh] overflow-auto pr-1">
            <div
              v-for="fb in feedbacks"
              :key="fb.id"
              class="flex items-center gap-3 p-3 border border-default/60 rounded-lg cursor-pointer hover:bg-default/40"
              @click="openDetail(fb)"
            >
              <!-- 有图才渲染 <img>；无图给占位，避免 src="" 触发浏览器的破图图标 -->
              <div class="h-12 w-20 rounded border border-default/50 flex-shrink-0 overflow-hidden bg-default/40 flex items-center justify-center">
                <img
                  v-if="imageOf(fb)"
                  :src="imageOf(fb)"
                  class="h-full w-full object-cover"
                  alt="feedback"
                />
                <UIcon v-else name="i-lucide-image-off" class="size-4 text-muted" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="text-sm font-medium truncate">{{ fb.name }}</div>
                <div class="text-xs text-muted truncate">
                  {{ typeLabel(fb.type) }} · {{ userLabel(fb) }} · {{ timeLabel(fb.createdAt) }}
                </div>
              </div>
              <UIcon name="i-lucide-chevron-right" class="size-4 text-muted flex-shrink-0" />
            </div>
            <div v-if="!loading && feedbacks.length === 0" class="py-10 text-center text-muted text-sm">
              {{ $t('feedback.empty') }}
            </div>
            <div v-if="loading" class="py-10 text-center text-muted text-sm">
              {{ $t('common.loading') }}
            </div>
          </div>
          <div class="flex items-center justify-between gap-3 pt-2 border-t border-default/50">
            <span class="text-xs text-muted shrink-0">{{ $t('feedback.total', { n: total }) }}</span>
            <div class="flex items-center gap-2">
              <span class="text-xs text-muted shrink-0">{{ $t('feedback.rowsPerPage') }}</span>
              <USelect
                :model-value="pageSize"
                :items="pageSizeOptions"
                value-key="value"
                size="xs"
                class="w-20"
                @update:model-value="onPageSizeChange"
              />
              <UPagination
                :page="page"
                :total="total"
                :items-per-page="pageSize"
                :sibling-count="1"
                @update:page="onPageChange"
              />
            </div>
          </div>
        </div>

        <!-- 普通用户：提交反馈表单 -->
        <div v-else class="space-y-4">
          <UFormField :label="$t('feedback.name')">
            <UTextarea
              v-model="form.name"
              class="w-full"
              :rows="3"
              :placeholder="$t('feedback.namePlaceholder')"
            />
          </UFormField>

          <UFormField :label="$t('feedback.type')">
            <USelect v-model="form.type" :items="typeOptions" class="w-full" />
          </UFormField>

          <UFormField :label="$t('feedback.content')">
            <div class="w-full space-y-2">
              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                class="hidden"
                @change="onFileChange"
              />
              <UButton
                v-if="!form.content"
                icon="i-lucide-image-plus"
                color="primary"
                variant="outline"
                :label="$t('feedback.chooseImage')"
                @click="fileInput?.click()"
              />
              <div v-else class="flex items-start gap-3">
                <img
                  :src="form.content"
                  class="max-h-40 max-w-full rounded border border-default/50 object-contain"
                  alt="feedback preview"
                />
                <div class="flex flex-col gap-1">
                  <UButton
                    icon="i-lucide-rotate-ccw"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    :label="$t('feedback.reChoose')"
                    @click="fileInput?.click()"
                  />
                  <UButton
                    icon="i-lucide-x"
                    color="error"
                    variant="ghost"
                    size="xs"
                    :label="$t('common.cancel')"
                    @click="clearContent"
                  />
                </div>
              </div>
            </div>
          </UFormField>

          <div class="flex justify-end gap-2 pt-4">
            <UButton :label="$t('common.cancel')" color="neutral" variant="ghost" @click="isOpen = false" />
            <UButton :label="$t('common.save')" color="primary" :loading="saving" @click="submit" />
          </div>
        </div>
      </div>
    </template>
  </UModal>

  <!-- 详情：点击列表行弹出，显示完整信息 + 原图 -->
  <UModal v-model:open="detailOpen" :ui="{ content: 'sm:max-w-3xl' }" scrollable>
    <template #content>
      <div v-if="detail" class="p-6 space-y-4">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-xs text-muted">{{ $t('feedback.detail') }}</div>
            <h3 class="text-lg font-semibold break-words">{{ detail.name }}</h3>
            <div class="text-xs text-muted mt-1">
              {{ typeLabel(detail.type) }} · {{ userLabel(detail) }} · {{ timeLabel(detail.createdAt) }}
            </div>
          </div>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="sm"
            :aria-label="$t('feedback.closeDetail')"
            @click="detailOpen = false"
          />
        </div>

        <dl class="grid grid-cols-[88px_1fr] gap-x-3 gap-y-2 text-sm">
          <dt class="text-muted">{{ $t('feedback.type') }}</dt>
          <dd>
            <UBadge color="info" variant="subtle" size="sm">{{ typeLabel(detail.type) }}</UBadge>
          </dd>

          <dt class="text-muted">{{ $t('feedback.username') }}</dt>
          <dd class="break-words">
            {{ detail.userName || '-' }}
            <span v-if="detail.username" class="text-muted">({{ detail.username }})</span>
            <span class="text-muted"> · #{{ detail.userId }}</span>
          </dd>

          <dt class="text-muted">{{ $t('feedback.name') }}</dt>
          <dd class="break-words">{{ detail.name }}</dd>

          <dt class="text-muted">{{ $t('feedback.content') }}</dt>
          <dd>
            <img
              v-if="imageOf(detail)"
              :src="imageOf(detail)"
              class="max-h-[55vh] max-w-full rounded border border-default/50 object-contain cursor-zoom-in"
              :alt="detail.name"
              @click="openFullImage(detail)"
            />
            <span v-else class="text-muted text-sm">{{ $t('feedback.noImage') }}</span>
          </dd>
        </dl>

        <div class="flex justify-end pt-2 border-t border-default/50">
          <UButton :label="$t('common.close')" color="neutral" variant="ghost" @click="detailOpen = false" />
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const isOpen = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const toast = useToast()
const { hasRole } = useAuth()

// 管理员视图：只读分页列表；普通用户视图：提交表单
const isAdmin = computed(() => hasRole('admin'))

// ====================== 管理员分页列表 ======================
const feedbacks = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)

const pageSizeOptions = [
  { label: '10', value: 10 },
  { label: '20', value: 20 },
  { label: '50', value: 50 },
  { label: '100', value: 100 },
]

async function loadFeedbacks() {
  if (!isAdmin.value || import.meta.server) return
  loading.value = true
  try {
    const data = await cRequest<{ data: any[]; total: number }>(
      `/api/feedback/list?page=${page.value}&pageSize=${pageSize.value}`,
    )
    feedbacks.value = data?.data ?? []
    total.value = data?.total ?? 0
  } catch {
    feedbacks.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function onPageChange(p: number) {
  page.value = p
  loadFeedbacks()
}

/** 切换每页条数：回到第 1 页重新拉取（否则可能停在越界页码导致空列表） */
function onPageSizeChange(size: number) {
  const next = Number(size)
  if (!next || next === pageSize.value) return
  pageSize.value = next
  page.value = 1
  loadFeedbacks()
}

// immediate: 弹窗是 Lazy + v-if 门控，组件创建即已打开，靠"变化时"触发会漏掉首次加载（管理员列表为空）
watch(isOpen, (val) => {
  if (val && isAdmin.value) {
    page.value = 1
    loadFeedbacks()
  }
}, { immediate: true })

/** content 可能是 { text: base64 }、纯 base64 字符串或旧版文档对象 */
function imageOf(fb: any): string {
  const c = fb?.content
  const raw = typeof c === 'string' ? c : c && typeof c.text === 'string' ? c.text : ''
  const trimmed = String(raw || '').trim()
  if (trimmed.startsWith('data:image/')) return trimmed
  if (/^[A-Za-z0-9+/=]+$/.test(trimmed)) return `data:image/webp;base64,${trimmed}`
  return ''
}

/** 提交人：显示名 + 账号（username），都缺才退到 #id */
function userLabel(fb: any): string {
  const name = fb?.userName || ''
  const uname = fb?.username || ''
  if (name && uname) return `${name} (${uname})`
  return name || uname || `#${fb?.userId ?? '-'}`
}

// ====================== 详情弹窗 ======================
const detailOpen = ref(false)
const detail = ref<any>(null)

function openDetail(fb: any) {
  detail.value = fb
  detailOpen.value = true
}

function openFullImage(fb: any) {
  const src = imageOf(fb)
  if (src) window.open(src, '_blank')
}

// 关闭详情时清空，避免下次打开闪现上一条
watch(detailOpen, (val) => {
  if (!val) detail.value = null
})

const typeLabels: Record<string, string> = {
  bug: t('feedback.typeBug'),
  suggestion: t('feedback.typeSuggestion'),
  requirement: t('feedback.typeRequirement'),
}

function typeLabel(type: string): string {
  return typeLabels[type] || type || '-'
}

function timeLabel(v: any): string {
  if (!v) return '-'
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString()
}
// =============================================================

const typeOptions = [
  { label: t('feedback.typeBug'), value: 'bug' },
  { label: t('feedback.typeSuggestion'), value: 'suggestion' },
  { label: t('feedback.typeRequirement'), value: 'requirement' },
]

const emptyContent = () => ''
const form = reactive<{ name: string; type: string; content: string }>({
  name: '',
  type: 'suggestion',
  content: emptyContent(),
})

const saving = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

// 每次打开时重置表单
watch(isOpen, (val) => {
  if (val) {
    form.name = ''
    form.type = 'suggestion'
    form.content = emptyContent()
    if (fileInput.value) fileInput.value.value = ''
  }
})

/** 读取图片文件为 base64 data URL */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('图片读取失败'))
    reader.readAsDataURL(file)
  })
}

/** 选择图片：压缩后转 base64 存入 content */
async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const compressed = await compressImage(file)
    form.content = await fileToBase64(compressed)
  } catch (err: any) {
    toast.add({ title: err?.message || t('common.operationFailed'), color: 'error' })
    if (fileInput.value) fileInput.value.value = ''
  }
}

function clearContent() {
  form.content = ''
  if (fileInput.value) fileInput.value.value = ''
}

async function submit() {
  if (!form.name.trim()) {
    toast.add({ title: t('feedback.nameRequired'), color: 'error' })
    return
  }

  saving.value = true
  try {
    await cRequest('/api/feedback/add', {
      method: 'POST',
      body: { name: form.name.trim(), type: form.type, content: form.content },
    })
    toast.add({ title: t('feedback.submitSuccess'), color: 'success' })
    isOpen.value = false
  } catch (err: any) {
    toast.add({ title: err?.message || t('common.operationFailed'), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>