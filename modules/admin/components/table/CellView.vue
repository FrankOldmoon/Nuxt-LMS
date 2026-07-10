<template>
  <div class="admin-cell-view inline-flex items-center min-w-0">
    <!-- 空值 -->
    <span v-if="isEmpty" class="text-muted text-xs">-</span>

    <!-- 图标（lucide / iconify 名称） -->
    <UIcon
      v-else-if="type === 'icon'"
      :name="fullIconName(String(value))"
      class="size-4"
    />

    <!-- 图片 -->
    <UAvatar
      v-else-if="type === 'image' && String(value)"
      :src="String(value)"
      :alt="String(value)"
      size="2xs"
      class="cursor-pointer"
      @click="previewImage = true"
    />
    <UModal v-if="type === 'image' && String(value)" v-model:open="previewImage">
      <template #content>
        <img :src="String(value)" :alt="String(value)" class="max-w-full max-h-[80vh] mx-auto" />
      </template>
    </UModal>

    <!-- 文件列表（每行一个链接） -->
    <UPopover v-else-if="type === 'file'" :content="{ align: 'start' }">
      <UBadge color="neutral" variant="subtle" size="sm" class="cursor-pointer">
        <UIcon name="i-lucide-paperclip" class="size-3 mr-1" />
        {{ t('admin.cell.files', { n: fileCount }) }}
      </UBadge>
      <template #content>
        <div class="max-w-[480px] max-h-[320px] overflow-auto p-2 space-y-1">
          <a
            v-for="(url, idx) in fileUrls"
            :key="idx"
            :href="url"
            target="_blank"
            rel="noopener"
            class="flex items-center gap-2 text-xs text-blue-500 hover:underline truncate"
          >
            <UIcon name="i-lucide-link" class="size-3 shrink-0" />
            <span class="truncate">{{ url }}</span>
          </a>
          <div v-if="fileUrls.length === 0" class="text-xs text-muted py-2 text-center">
            {{ t('admin.cell.empty') }}
          </div>
        </div>
      </template>
    </UPopover>

    <!-- 日期 / 时间戳 -->
    <span v-else-if="type === 'date'" class="text-xs whitespace-nowrap" :title="rawString">
      {{ dateLabel }}
    </span>

    <!-- 布尔 -->
    <UBadge v-else-if="type === 'boolean'" :color="value ? 'success' : 'neutral'" variant="subtle" size="sm">
      {{ value ? t('admin.cell.true') : t('admin.cell.false') }}
    </UBadge>

    <!-- 枚举 -->
    <UBadge v-else-if="type === 'enum'" color="info" variant="subtle" size="sm">
      {{ String(value) }}
    </UBadge>

    <!-- JSON -->
    <UPopover v-else-if="type === 'json'" :content="{ align: 'start' }">
      <UBadge color="neutral" variant="subtle" size="sm" class="cursor-pointer">{{ t('admin.cell.json') }}</UBadge>
      <template #content>
        <pre class="max-w-[480px] max-h-[320px] overflow-auto text-xs p-2 bg-default rounded">{{ jsonPretty }}</pre>
      </template>
    </UPopover>

    <!-- 外键 -->
    <span v-else-if="type === 'fk'" class="text-xs">
      <span v-if="fkLabel" :title="`#${value}`">{{ fkLabel }}</span>
      <span v-else class="text-muted">#{{ value }}</span>
    </span>

    <!-- 数字 -->
    <span v-else-if="type === 'number'" class="text-xs tabular-nums">{{ Number(value).toLocaleString() }}</span>

    <!-- 主键 id -->
    <UBadge v-else-if="type === 'id'" color="neutral" variant="soft" size="sm" class="font-mono">{{ value }}</UBadge>

    <!-- 密码脱敏 -->
    <span v-else-if="type === 'password'" class="text-muted text-xs">••••••</span>

    <!-- 文本 -->
    <span v-else class="text-sm truncate" :title="rawString">{{ textLabel }}</span>
  </div>
</template>

<script setup lang="ts">
import type { ColumnMeta } from '../../utils/types'
import { cellTypeFor, isImageColumn, isFileColumn, isIconColumn } from '../../utils/widgetMap'

const props = defineProps<{
  column: ColumnMeta
  value: any
  /** 外键已解析的标签（由父组件查询并传入） */
  fkLabel?: string
}>()

const { t } = useI18n()
const previewImage = ref(false)

const type = computed(() => {
  // 文件列 → file
  if (isFileColumn(props.column) && props.value) return 'file'
  // 图标列 → icon
  if (isIconColumn(props.column) && typeof props.value === 'string' && props.value) return 'icon'
  // 图片列需要 value 是字符串才按图片渲染
  if (isImageColumn(props.column) && typeof props.value === 'string' && props.value) return 'image'
  return cellTypeFor(props.column)
})

const isEmpty = computed(() => props.value === null || props.value === undefined || props.value === '')

const rawString = computed(() => (props.value === null || props.value === undefined ? '' : String(props.value)))

const dateLabel = computed(() => {
  if (!props.value) return ''
  const d = new Date(props.value)
  if (isNaN(d.getTime())) return String(props.value)
  return d.toLocaleString()
})

const jsonPretty = computed(() => {
  try {
    return JSON.stringify(props.value, null, 2)
  } catch {
    return String(props.value)
  }
})

const textLabel = computed(() => {
  const s = rawString.value
  // 超长截断展示
  return s.length > 60 ? s.slice(0, 60) + '…' : s
})

// 文件 URL 列表：支持 JSON 数组字符串 / 数组 / 单个 URL
const fileUrls = computed<string[]>(() => {
  const v = props.value
  if (!v) return []
  if (Array.isArray(v)) return v.filter(Boolean).map(String)
  if (typeof v === 'string') {
    const s = v.trim()
    if (!s) return []
    // 尝试解析为 JSON 数组
    if (s.startsWith('[')) {
      try {
        const arr = JSON.parse(s)
        if (Array.isArray(arr)) return arr.filter(Boolean).map(String)
      } catch { /* fall through */ }
    }
    // 尝试按换行 / 逗号分隔
    if (s.includes('\n')) return s.split(/\n+/).map((x) => x.trim()).filter(Boolean)
    if (s.includes(',')) return s.split(',').map((x) => x.trim()).filter(Boolean)
    return [s]
  }
  return [String(v)]
})

const fileCount = computed(() => fileUrls.value.length)

// 兼容 icon / i- 前缀
function fullIconName(name: string) {
  if (!name) return 'i-lucide-circle'
  if (name.startsWith('i-') || name.includes(':')) return name
  return `i-lucide-${name}`
}
</script>
