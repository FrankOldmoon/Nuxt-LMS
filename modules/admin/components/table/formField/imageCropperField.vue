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
      <TableImageCropperTrigger
        :stencil-type="isAvatar ? 'circle' : 'rectangle'"
        :output-size="isAvatar ? { width: 128, height: 128 } : null"
        @uploaded="(url: string) => { form[col.jsName] = url }"
      />
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
const props = defineProps<{ col: ColumnMeta; form: Record<string, any> }>()
const previewImage = ref(false)
// 头像类列名（avatar/head）使用圆形裁剪 + 128x128 输出；其余图片列保持矩形原尺寸
const isAvatar = computed(() => /avatar|head/i.test(props.col.jsName))
</script>
