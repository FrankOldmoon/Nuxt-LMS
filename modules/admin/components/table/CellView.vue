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
    <TableCellImage
      v-else-if="type === 'image' && String(value)"
      :value="value"
    />

    <!-- 文件列表（每行一个链接） -->
    <TableCellFile
      v-else-if="type === 'file'"
      :value="value"
    />

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

const props = defineProps<{
  column: ColumnMeta
  value: any
  /** 外键已解析的标签（由父组件查询并传入） */
  fkLabel?: string
}>()

const { t } = useI18n()

const { type, isEmpty, rawString, dateLabel, jsonPretty, textLabel, fullIconName } =
  useCellView(() => props.column, () => props.value)
</script>
