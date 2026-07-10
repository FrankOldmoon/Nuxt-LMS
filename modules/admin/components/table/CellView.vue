<template>
  <div class="admin-cell-view inline-flex items-center min-w-0">
    <!-- 空值 -->
    <span v-if="isEmpty" class="text-muted text-xs">-</span>

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
import { cellTypeFor, isImageColumn } from '../../utils/widgetMap'

const props = defineProps<{
  column: ColumnMeta
  value: any
  /** 外键已解析的标签（由父组件查询并传入） */
  fkLabel?: string
}>()

const { t } = useI18n()
const previewImage = ref(false)

const type = computed(() => {
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
</script>
