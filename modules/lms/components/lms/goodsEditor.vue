<template>
  <div class="space-y-4">
    <USeparator :label="courseId === 0 ? $t('goods.global') : $t('goods.course')" class="my-4" />

    <div v-if="loading" class="flex justify-center py-4">
      <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin text-muted" />
    </div>

    <div v-else class="space-y-3">
      <!-- Existing goods list -->
      <div v-for="(good, idx) in goods" :key="good.id || `new_${idx}`"
        class="border border-default rounded-lg p-3 space-y-2 bg-elevated/30">
        <div class="flex items-center gap-2">
          <UIcon :name="fullIconName(good.content.icon)" :class="iconColorClass(good.content.color)" class="size-5 shrink-0" />
          <UInput v-model="good.name" size="xs" class="flex-1" :placeholder="$t('goods.namePlaceholder')" />
          <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="xs"
            :loading="deletingId === good.id" @click="deleteGood(good.id)" />
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <USelect v-model="good.content.color" :items="colorOpts" size="xs" class="w-28" />
          <UInput v-model="good.content.icon" size="xs" class="flex-1 min-w-[120px]"
            :placeholder="$t('goods.namePlaceholder')" />
        </div>
        <UInput v-model="good.content.description" size="xs" class="w-full"
          :placeholder="$t('goods.namePlaceholder')" />
        <!-- price/sell price/stock -->
        <div class="flex items-center gap-2 flex-wrap">
          <UFormField :label="$t('goods.price')" size="xs" class="flex-1 min-w-[80px]">
            <UInput v-model.number="good.price" type="number" size="xs" class="w-full" />
          </UFormField>
          <UFormField :label="$t('goods.sellPrice')" size="xs" class="flex-1 min-w-[80px]">
            <UInput v-model.number="good.sellPrice" type="number" size="xs" class="w-full" />
          </UFormField>
          <UFormField :label="$t('goods.stock')" size="xs" class="flex-1 min-w-[80px]">
            <UInput v-model.number="good.stock" type="number" size="xs" class="w-full"
              :placeholder="$t('goods.stockUnlimited')" />
          </UFormField>
        </div>
      </div>

      <!-- Add button -->
      <UButton :label="$t('goods.add')" icon="i-lucide-plus" color="primary" variant="outline" size="sm"
        block @click="addGood" />

      <!-- Save Button -->
      <div class="flex justify-end pt-2">
        <UButton :label="$t('common.save')" color="primary" size="sm" :loading="saving" @click="saveAll" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGoodsEditor } from './useGoodsEditor'
import type { ComputedRef } from 'vue'

const props = defineProps<{
  courseId: number
}>()

const courseIdRef = computed(() => props.courseId) as ComputedRef<number>

const {
  loading, goods, fullIconName, iconColorClass, colorOpts,
  deletingId, deleteGood, addGood, saving, saveAll,
} = useGoodsEditor(courseIdRef)
</script>
