<template>
  <div class="admin-cell-view inline-flex items-center min-w-0">
    <!-- Empty value -->
    <span v-if="isEmpty" class="text-muted text-xs">-</span>

    <!-- Icon (lucide / iconify name) -->
    <UIcon
      v-else-if="type === 'icon'"
      :name="fullIconName(String(value))"
      class="size-4"
    />

    <!-- Image -->
    <TableCellImage
      v-else-if="type === 'image' && String(value)"
      :value="value"
    />

    <!-- File list (one link per line) -->
    <TableCellFile
      v-else-if="type === 'file'"
      :value="value"
    />

    <!-- Date / timestamp -->
    <span v-else-if="type === 'date'" class="text-xs whitespace-nowrap" :title="rawString">
      {{ dateLabel }}
    </span>

    <!-- Boolean -->
    <UBadge v-else-if="type === 'boolean'" :color="value ? 'success' : 'neutral'" variant="subtle" size="sm">
      {{ value ? t('admin.cell.true') : t('admin.cell.false') }}
    </UBadge>

    <!-- Enum -->
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

    <!-- Foreign key -->
    <span v-else-if="type === 'fk'" class="text-xs">
      <span v-if="fkLabel" :title="`#${value}`">{{ fkLabel }}</span>
      <span v-else class="text-muted">#{{ value }}</span>
    </span>

    <!-- Number -->
    <span v-else-if="type === 'number'" class="text-xs tabular-nums">{{ Number(value).toLocaleString() }}</span>

    <!-- Primary key id -->
    <UBadge v-else-if="type === 'id'" color="neutral" variant="soft" size="sm" class="font-mono">{{ value }}</UBadge>

    <!-- Password masked -->
    <span v-else-if="type === 'password'" class="text-muted text-xs">••••••</span>

    <!-- Text -->
    <span v-else class="text-sm truncate" :title="rawString">{{ textLabel }}</span>
  </div>
</template>

<script setup lang="ts">
import type { ColumnMeta } from '../../utils/types'

const props = defineProps<{
  column: ColumnMeta
  value: any
  /** Foreign key resolved label (queried and passed in by parent component) */
  fkLabel?: string
}>()

const { t } = useI18n()

const { type, isEmpty, rawString, dateLabel, jsonPretty, textLabel, fullIconName } =
  useCellView(() => props.column, () => props.value)
</script>
