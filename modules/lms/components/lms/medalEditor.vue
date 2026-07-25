<template>
  <div class="space-y-4">
    <USeparator :label="$t('medal.editorTitle')" class="my-4" />

    <div v-if="loading" class="flex justify-center py-4">
      <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin text-muted" />
    </div>

    <div v-else class="space-y-3">
      <!-- 已有奖章列表 -->
      <div v-for="(medal, idx) in medals" :key="medal.id || `new_${idx}`"
        class="border border-default rounded-lg p-3 space-y-2 bg-elevated/30">
        <div class="flex items-center gap-2">
          <UIcon :name="fullIconName(medal.content.icon)" :class="iconColorClass(medal.content.color)" class="size-5 shrink-0" />
          <UInput v-model="medal.name" size="xs" class="flex-1" :placeholder="$t('medal.namePlaceholder')" />
          <USelect v-model="medal.content.tier" :items="tierOpts" size="xs" class="w-24" />
          <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="xs"
            :loading="deletingId === medal.id" @click="deleteMedal(medal.id)" />
        </div>
        <div class="flex items-center gap-2">
          <USelect v-model="medal.content.color" :items="colorOpts" size="xs" class="w-28" />
          <!-- 图标选择器（Popover 弹窗），图标带当前颜色 -->
          <FormInputIcon v-model="medal.content.icon" :icon-color="iconColorClass(medal.content.color)" />
        </div>
        <UInput v-model="medal.content.description" size="xs" class="w-full"
          :placeholder="$t('medal.descPlaceholder')" />
        <!-- 条件编辑 -->
        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted">{{ $t('medal.conditions') }}</span>
            <div class="flex items-center gap-2">
              <USelect v-model="medal.content.logic" :items="logicOpts" size="xs" class="w-24" />
              <UButton icon="i-lucide-plus" size="xs" variant="ghost" @click="addCondition(medal)" />
            </div>
          </div>
          <div v-for="(cond, idx) in medal.content.conditions" :key="idx"
            class="flex items-center gap-1">
            <USelect v-model="cond.metric" :items="metricOpts" size="xs" class="flex-1" />
            <USelect v-model="cond.op" :items="opOpts" size="xs" class="w-16" />
            <UInput v-model.number="cond.value" type="number" size="xs" class="w-24" />
            <UButton icon="i-lucide-x" size="xs" variant="ghost" color="error"
              @click="medal.content.conditions.splice(idx, 1)" />
          </div>
        </div>
      </div>

      <!-- 新增按钮 -->
      <UButton :label="$t('medal.add')" icon="i-lucide-plus" color="primary" variant="outline" size="sm"
        block @click="addMedal" />

      <!-- 保存按钮 -->
      <div class="flex justify-end pt-2">
        <UButton :label="$t('common.save')" color="primary" size="sm" :loading="saving" @click="saveAll" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { useMedalEditor } from './useMedalEditor'

const {
  loading, medals, fullIconName, iconColorClass, tierOpts, colorOpts,
  logicOpts, metricOpts, opOpts, addCondition, deletingId, deleteMedal,
  addMedal, saving, saveAll,
} = useMedalEditor()
</script>
