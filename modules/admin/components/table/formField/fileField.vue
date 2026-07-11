<template>
  <div>
    <FormInputFile v-model="form[col.jsName]" multiple size="sm" :placeholder="t('admin.form.uploadFiles')" />
    <div v-if="form[col.jsName] && Array.isArray(form[col.jsName]) && form[col.jsName].length" class="mt-2 space-y-1">
      <div
        v-for="(url, idx) in (form[col.jsName] as string[])"
        :key="idx"
        class="flex items-center gap-2 text-xs"
      >
        <UIcon name="i-lucide-link" class="size-3 text-muted shrink-0" />
        <a :href="url" target="_blank" class="text-blue-500 hover:underline truncate">{{ url }}</a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ColumnMeta } from '../../../utils/types'
defineProps<{ col: ColumnMeta; form: Record<string, any> }>()
const { t } = useI18n()
</script>
