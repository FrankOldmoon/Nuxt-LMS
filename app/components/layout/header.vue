<template>
  <UHeader
    title="Nuxt Hub"
    to="/"
    :ui="{ left: 'lg:flex-1 flex items-center gap-1.5' }"
  >
    <!-- 左侧：Logo + 标题 -->
    <template #left>
      <ULink
        to="/"
        class="flex items-center gap-2 font-bold text-lg text-highlighted"
        aria-label="Nuxt Hub"
      >
        <UIcon name="i-lucide-boxes" class="size-6 text-primary" />
        <span class="hidden sm:inline">Nuxt Hub</span>
      </ULink>
    </template>

    <!-- 中间：水平导航菜单（仅桌面端显示） -->
    <div class="flex items-center gap-2">
      <LayoutNav orientation="horizontal" />
    </div>

    <!-- 右侧：操作按钮 -->
    <template #right>
      <UTooltip :text="$t('common.search')" :content="{ side: 'bottom' }">
        <UButton
          icon="i-lucide-search"
          color="neutral"
          variant="ghost"
          :aria-label="$t('common.search')"
        />
      </UTooltip>
      <UColorModeButton />

      <!-- SSR 直接渲染：未登录 → Login 按钮，已登录 → 用户名 + 下拉菜单 -->
      <UButton
        v-if="!isLoggedIn"
        :label="$t('auth.login')"
        color="neutral"
        variant="ghost"
        icon="i-lucide-log-in"
        @click="() => { showLoginModal = true }"
      />

      <UDropdownMenu
        v-else
        :items="userMenuItems"
      >
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-circle-user"
          :label="user?.name"
          class="font-medium"
        />
      </UDropdownMenu>
    </template>

    <!-- 移动端菜单内容 -->
    <template #body>
      <LayoutNav orientation="vertical" class="w-full" />
    </template>
  </UHeader>

  <!-- 登录/注册弹窗 -->
  <AuthLoginModal
    v-model:open="showLoginModal"
    @success="onLoginSuccess"
  />
</template>

<script setup lang="ts">
const { user, isLoggedIn, logout } = useAuth()
const toast = useToast()
const { t } = useI18n()

const showLoginModal = ref(false)

function onLoginSuccess() {
  showLoginModal.value = false
}

const userMenuItems = computed(() => [
  [
    {
      label: user.value?.name || user.value?.username || '',
      type: 'label' as const,
    },
  ],
  [
    {
      label: t('auth.logout'),
      icon: 'i-lucide-log-out',
      onSelect: async () => {
        await logout()
        toast.add({
          title: t('auth.logout'),
          color: 'neutral',
        })
      },
    },
  ],
])
</script>
