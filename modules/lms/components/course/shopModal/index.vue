<template>
  <UModal v-model:open="open" :ui="{ content: 'sm:max-w-3xl' }">
    <template #content>
      <div class="p-6 space-y-4">
        <!-- 头部：标题 + 金币余额 -->
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">{{ $t('shop.title') }}</h3>
          <div class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-elevated">
            <UIcon name="i-lucide-coins" class="size-4 text-warning" />
            <span class="font-mono font-bold text-sm">{{ coin }}</span>
          </div>
        </div>

        <div v-if="loading" class="flex items-center justify-center py-10 text-muted">
          <UIcon name="i-lucide-loader-2" class="animate-spin size-5 mr-2" />
          <span class="text-sm">{{ $t('common.loading') }}</span>
        </div>

        <div v-else>
          <!-- Tab 切换：商店 / 背包 -->
          <UTabs v-model="activeTab" :items="tabItems" class="mb-4" />

          <!-- 商店 Tab -->
          <div v-show="activeTab === 'shop'" class="space-y-3 max-h-[55vh] overflow-y-auto">
            <p v-if="!goods.length" class="text-center py-8 text-muted text-sm">{{ $t('shop.emptyShop') }}</p>
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div v-for="good in goods" :key="good.id"
                class="flex items-center gap-3 p-3 rounded-lg border border-default bg-elevated/30">
                <div class="size-10 rounded-lg bg-elevated flex items-center justify-center shrink-0">
                  <UIcon :name="fullIconName(good.content.icon)" :class="iconColorClass(good.content.color)" class="size-5" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <p class="text-sm font-medium truncate">{{ good.name }}</p>
                    <UBadge v-if="good.courseId === 0" :label="$t('goods.global')" size="xs" color="neutral" variant="outline" />
                  </div>
                  <p v-if="good.content.description" class="text-xs text-muted truncate">{{ good.content.description }}</p>
                  <div class="flex items-center gap-2 mt-1">
                    <span class="flex items-center gap-0.5 text-xs font-mono text-warning">
                      <UIcon name="i-lucide-coins" class="size-3" />{{ good.price }}
                    </span>
                    <span v-if="good.stock !== -1" class="text-xs text-muted">
                      {{ $t('goods.stock') }}: {{ good.stock }}
                    </span>
                    <span v-else class="text-xs text-muted">{{ $t('goods.stockUnlimited') }}</span>
                    <span v-if="getOwnedQuantity(good.id, good.courseId) > 0" class="text-xs text-primary">
                      {{ $t('shop.owned') }}: {{ getOwnedQuantity(good.id, good.courseId) }}
                    </span>
                  </div>
                </div>
                <UButton
                  icon="i-lucide-shopping-cart"
                  color="primary"
                  size="xs"
                  variant="soft"
                  :loading="buyingId === good.id"
                  :disabled="good.stock === 0 || coin < good.price"
                  @click="buy(good.id)"
                >
                  {{ $t('shop.buy') }}
                </UButton>
              </div>
            </div>
          </div>

          <!-- 背包 Tab -->
          <div v-show="activeTab === 'bag'" class="space-y-3 max-h-[55vh] overflow-y-auto">
            <p v-if="!bags.length" class="text-center py-8 text-muted text-sm">{{ $t('shop.emptyBag') }}</p>
            <div v-else class="space-y-2">
              <div v-for="item in bags" :key="`${item.goodId}-${item.courseId}`"
                class="flex items-center gap-3 p-3 rounded-lg border border-default bg-elevated/30">
                <div class="size-10 rounded-lg bg-elevated flex items-center justify-center shrink-0">
                  <UIcon :name="fullIconName(item.content.icon)" :class="iconColorClass(item.content.color)" class="size-5" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <p class="text-sm font-medium truncate">{{ item.name }}</p>
                    <UBadge :label="$t('shop.quantity', { count: item.quantity })" size="xs" color="primary" variant="subtle" />
                  </div>
                  <p v-if="item.content.description" class="text-xs text-muted truncate">{{ item.content.description }}</p>
                  <span class="flex items-center gap-0.5 text-xs font-mono text-success mt-1">
                    <UIcon name="i-lucide-coins" class="size-3" />{{ item.sellPrice }}
                  </span>
                </div>
                <UButton
                  icon="i-lucide-rotate-ccw"
                  color="neutral"
                  size="xs"
                  variant="outline"
                  :loading="sellingId === item.goodId"
                  :disabled="item.sellPrice <= 0"
                  @click="sell(item.goodId)"
                >
                  {{ $t('shop.sell') }}
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { useShop } from './useShop'

const props = defineProps<{
  courseId: number
}>()

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()

const courseIdRef = computed(() => props.courseId)
const {
  coin, goods, bags, loading, buyingId, sellingId,
  fetchAll, buy, sell, getOwnedQuantity,
} = useShop(courseIdRef)

const activeTab = ref<'shop' | 'bag'>('shop')
const tabItems = computed(() => [
  { label: t('shop.tabShop'), value: 'shop', icon: 'i-lucide-store' },
  { label: t('shop.tabBag'), value: 'bag', icon: 'i-lucide-backpack' },
])

function fullIconName(name?: string) {
  if (!name) return 'i-lucide-package'
  if (name.startsWith('i-') || name.includes(':')) return name
  return `i-lucide-${name}`
}

function iconColorClass(color?: string) {
  const map: Record<string, string> = {
    bronze: 'text-amber-700',
    silver: 'text-gray-400',
    gold: 'text-amber-400',
    diamond: 'text-cyan-400',
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
    info: 'text-info',
  }
  return map[color || ''] || 'text-primary'
}

watch(open, (val) => {
  if (val) fetchAll()
})
</script>
