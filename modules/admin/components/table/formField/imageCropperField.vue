<template>
  <div class="space-y-2">
    <div class="flex items-center gap-2">
      <UInput v-model="form[col.jsName]" size="sm" class="flex-1" placeholder="https://..." />
      <UAvatar
        v-if="form[col.jsName]"
        :src="String(form[col.jsName])"
        size="sm"
        class="cursor-pointer"
        @click="previewImage = true"
      />
      <TableImageCropperTrigger @uploaded="(url: string) => { form[col.jsName] = url }" />
    </div>
    <UModal v-model:open="previewImage">
      <template #content>
        <img :src="String(form[col.jsName])" class="max-w-full max-h-[80vh] mx-auto" />
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { ColumnMeta } from '../../../utils/types'
defineProps<{ col: ColumnMeta; form: Record<string, any> }>()
const previewImage = ref(false)
</script>
