<template>
  <UPopover v-model:open="popoverOpen" :ui="{ content: 'w-72' }">
    <button type="button"
      class="inline-flex items-center gap-2 px-2 py-1 rounded border border-default bg-elevated/30 hover:bg-elevated/60 transition-colors text-xs"
      :class="{ 'text-muted': !innerValue }">
      <UIcon v-if="innerValue" :name="fullIconName(innerValue)" class="size-4" :class="iconColor" />
      <UIcon v-else name="i-lucide-plus" class="size-4" />
      <span v-if="innerValue" class="truncate max-w-32">{{ innerValue }}</span>
      <span v-else>{{ placeholder || $t('formIcon.selectIcon') }}</span>
    </button>

    <template #content>
      <div class="p-3 space-y-2">
        <UInput
          v-model="searchText"
          icon="i-lucide-search"
          size="xs"
          class="w-full"
          :placeholder="$t('formIcon.searchPlaceholder')"
          @keydown.enter.prevent="selectMatchIcon"
        />

        <div class="max-h-56 overflow-y-auto">
          <div class="grid grid-cols-8 gap-1">
            <div
              v-for="name in pageIcons"
              :key="name"
              class="flex flex-col items-center justify-center p-1 rounded cursor-pointer transition-colors"
              :class="name === modelValue
                ? 'bg-primary/15 ring-1 ring-primary/30 text-primary'
                : 'hover:bg-elevated text-muted hover:text-highlighted'"
              @click="selectIcon(name)"
            >
              <UIcon :name="fullIconName(name)" class="size-4" />
              <span class="text-[9px] mt-0.5 truncate w-full text-center">{{ name }}</span>
            </div>
            <div v-if="!pageIcons.length" class="col-span-8 text-center text-xs text-muted py-4">
              {{ $t('formIcon.noResults') }}
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-default">
          <span class="text-xs text-muted">
            {{ $t('formIcon.pageInfo', { total: filterIcons.length, page, totalPage }) }}
          </span>
          <div class="flex gap-1">
            <UButton size="2xs" variant="outline" :disabled="page <= 1" icon="i-lucide-chevron-left" @click="page--" />
            <UButton size="2xs" variant="outline" :disabled="page >= totalPage" icon="i-lucide-chevron-right" @click="page++" />
          </div>
        </div>
      </div>
    </template>
  </UPopover>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  iconColor: { type: String, default: '' },
  pageSize: { type: Number, default: 40 },
})

const emit = defineEmits(['update:modelValue'])

const {
  popoverOpen, searchText, page, innerValue,
  fullIconName, filterIcons, totalPage, pageIcons,
  selectIcon, selectMatchIcon,
} = useIconPicker(
  () => props.modelValue,
  () => props.pageSize,
  (val) => emit('update:modelValue', val),
)
</script>
