<template>
  <UHeader :title="siteTitle" to="/" :ui="{ left: 'lg:flex-1 flex items-center gap-1.5' }">
    <!-- 左侧：Logo + 标题 -->
    <template #left>
      <ULink to="/" class="flex items-center gap-2 font-bold text-lg text-highlighted" :aria-label="siteTitle">
        <!-- 根据配置显示 Logo 或默认图标 -->
        <img v-if="logo" :src="logo" alt="Logo" class="size-6 object-contain" />
        <UIcon v-else name="i-lucide-boxes" class="size-6 text-primary" />
        <span class="hidden sm:inline">{{ siteTitle }}</span>
      </ULink>
    </template>

    <!-- 中间：水平导航菜单（仅桌面端显示） -->
    <div class="flex items-center gap-2">
      <LayoutHeaderNav orientation="horizontal" />
    </div>

    <!-- 右侧：操作按钮 -->
    <template #right>
      <UModal v-model:open="showSearchModal">
        <UTooltip :text="$t('common.search')" :content="{ side: 'bottom' }">
          <UButton icon="i-lucide-search" color="neutral" variant="ghost" :aria-label="$t('common.search')" />
        </UTooltip>
        <template #content>
          <!-- 搜索弹窗 -->
          <LayoutSearchModal @close="() => { showSearchModal = false }" />
        </template>
      </UModal>
      <UColorModeButton />

      <!-- 通知按钮（仅登录后显示） -->
      <UTooltip v-if="isLoggedIn" :text="$t('notification.title')" :content="{ side: 'bottom' }">
        <div class="relative">
          <UButton icon="i-lucide-bell" color="neutral" variant="ghost" :aria-label="$t('notification.title')"
            @click="() => { showNotificationModal = true }" />
          <span v-if="unreadCounts.notifyUnread > 0"
            class="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold pointer-events-none">
            {{ unreadCounts.notifyUnread > 9 ? '9+' : unreadCounts.notifyUnread }}
          </span>
        </div>
      </UTooltip>

      <!-- 消息按钮（仅登录后显示） -->
      <UTooltip v-if="isLoggedIn" :text="$t('message.title')" :content="{ side: 'bottom' }">
        <div class="relative">
          <UButton icon="i-lucide-message-square" color="neutral" variant="ghost" :aria-label="$t('message.title')"
            @click="() => { showMessageModal = true }" />
          <span v-if="unreadCounts.msgUnread > 0"
            class="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold pointer-events-none">
            {{ unreadCounts.msgUnread > 9 ? '9+' : unreadCounts.msgUnread }}
          </span>
        </div>
      </UTooltip>

      <!-- SSR 直接渲染：未登录 → Login 按钮，已登录 → 用户名 + 下拉菜单 -->
      <UButton v-if="!isLoggedIn" :label="$t('auth.login')" color="neutral" variant="ghost" icon="i-lucide-log-in"
        @click="() => { showLoginModal = true }" />

      <UDropdownMenu v-else :items="userMenuItems">
        <UButton color="neutral" variant="ghost" :label="user?.name" class="font-medium">
          <template #leading>
            <UAvatar :src="user?.avatarImg ?? undefined" :alt="user?.name" size="2xs" :text="user?.name?.charAt(0)" />
          </template>
        </UButton>
      </UDropdownMenu>
    </template>

    <!-- 移动端菜单内容 -->
    <template #body>
      <LayoutHeaderNav orientation="vertical" class="w-full" />
    </template>
  </UHeader>

  <!-- 登录/注册弹窗 -->
  <AuthLoginModal v-model:open="showLoginModal" @success="onLoginSuccess" />

  <!-- 个人资料弹窗 -->
  <AuthProfileModal v-model:open="showProfileModal" />

  <!-- 系统设置弹窗（仅管理员可见） -->
  <AuthSettingsModal v-model:open="showSettingsModal" />

  <!-- 通知弹窗 -->
  <LayoutNotificationModal v-model:open="showNotificationModal" />

  <!-- 消息弹窗 -->
  <LayoutMessageModal v-model:open="showMessageModal" />

  <!-- 导入用户弹窗（仅管理员） -->
  <AuthImportUsersModal v-model:open="showImportUsersModal" />

  <!-- 网盘文件弹窗 -->
  <FilesMyFilesModal v-model:open="showMyFilesModal" />


</template>

<script setup lang="ts">
const { user, isLoggedIn, hasRole, logout } = useAuth()
const toast = useToast()
const { t } = useI18n()

// 获取网站配置（SSR 兼容，自动导入）
const { siteTitle, logo } = useLmsConfig()

// 未读计数
const { counts: unreadCounts, refresh: refreshUnread } = useUnreadCounts()

const showLoginModal = ref(false)
const showProfileModal = ref(false)
const showSettingsModal = ref(false)
const showSearchModal = ref(false)
const showNotificationModal = ref(false)
const showMessageModal = ref(false)
const showImportUsersModal = ref(false)
const showMyFilesModal = ref(false)

function onLoginSuccess() {
  showLoginModal.value = false
  refreshUnread()
}

// 登录后挂载时拉取未读数
watch(isLoggedIn, (val) => {
  if (val) refreshUnread()
}, { immediate: true })

// 通知弹窗关闭后刷新未读数（已读状态可能变化）
watch(showNotificationModal, (val) => {
  if (!val && isLoggedIn.value) refreshUnread()
})

// 消息弹窗关闭后刷新未读数
watch(showMessageModal, (val) => {
  if (!val && isLoggedIn.value) refreshUnread()
})

const isAdmin = computed(() => hasRole('admin'))

const userMenuItems = computed(() => {
  const items: any[] = [
    [
      {
        label: t('profile.title'),
        icon: 'i-lucide-user-circle',
        onSelect: () => {
          showProfileModal.value = true
        },
      },
      {
        label: t('myFiles.title'),
        icon: 'i-lucide-hard-drive',
        onSelect: () => {
          showMyFilesModal.value = true
        },
      },
    ],
  ]

  // 管理员可看到系统设置和导入用户
  if (isAdmin.value) {
    items.push([
      {
        label: t('settings.title'),
        icon: 'i-lucide-settings',
        onSelect: () => {
          showSettingsModal.value = true
        },
      },
      {
        label: t('importUsers.title'),
        icon: 'i-lucide-users',
        onSelect: () => {
          showImportUsersModal.value = true
        },
      },
    ])
  }

  items.push([
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
  ])

  return items
})
</script>
