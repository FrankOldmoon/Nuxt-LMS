<template>
  <!-- 触发按钮：显示当前图标或占位 -->
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
        <!-- 搜索框 -->
        <UInput
          v-model="searchText"
          icon="i-lucide-search"
          size="xs"
          class="w-full"
          :placeholder="$t('formIcon.searchPlaceholder')"
          @keydown.enter.prevent="selectMatchIcon"
        />

        <!-- 图标网格 -->
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

        <!-- 分页栏 -->
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
import lucideJson from '@iconify-json/lucide/icons.json'

const allLucideIcons = Object.keys(lucideJson.icons)

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: '',
  },
  /** 图标颜色 class（如 text-amber-400），从父组件传入 */
  iconColor: {
    type: String,
    default: '',
  },
  pageSize: {
    type: Number,
    default: 40,
  },
})

const emit = defineEmits(['update:modelValue'])

const popoverOpen = ref(false)
const searchText = ref('')
const page = ref(1)

// 本地副本，确保组件内响应式
const innerValue = ref(props.modelValue)
watch(() => props.modelValue, (val) => { innerValue.value = val })
watch(innerValue, (val) => { emit('update:modelValue', val) })

// 图标全名：兼容 i-lucide-xxx 和 lucide:xxx
function fullIconName(name) {
  if (!name) return 'i-lucide-circle'
  if (name.startsWith('i-') || name.includes(':')) return name
  return `i-lucide-${name}`
}

// 筛选图标
const filterIcons = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()
  if (!keyword) return allLucideIcons
  return allLucideIcons.filter(name => name.toLowerCase().includes(keyword))
})

// 总页数
const totalPage = computed(() => Math.ceil(filterIcons.value.length / props.pageSize) || 1)

// 当前分页图标
const pageIcons = computed(() => {
  const start = (page.value - 1) * props.pageSize
  const end = start + props.pageSize
  return filterIcons.value.slice(start, end)
})

// 搜索词变更重置页码
watch(searchText, () => { page.value = 1 })

// 弹窗打开时重置搜索
watch(popoverOpen, (val) => {
  if (val) {
    searchText.value = ''
    page.value = 1
  }
})

// 选择图标
function selectIcon(name) {
  innerValue.value = name
  popoverOpen.value = false
}

// 回车选中第一个匹配图标
function selectMatchIcon() {
  const kw = searchText.value.trim()
  if (!kw) return
  const firstMatch = filterIcons.value[0]
  if (firstMatch) selectIcon(firstMatch)
}
</script>
