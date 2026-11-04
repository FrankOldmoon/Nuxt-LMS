<template>
  <UHeader :title="siteTitle" to="/">
    <template #left>
      <ULink to="/" class="flex items-center gap-2 font-bold text-lg text-highlighted" :aria-label="siteTitle">
        <img src="/logo.webp" alt="Logo" class="size-6 object-contain" />
        <span class="hidden sm:inline">{{ siteTitle }}</span>
      </ULink>
    </template>

    <!-- 中间：导航菜单插槽 -->
    <slot name="nav" />

    <template #right>
      <!-- 右侧扩展插槽 -->
      <slot name="header-right" />

      <UColorModeButton />

      <!-- 通知按钮 -->
      <UTooltip v-if="isLoggedIn && showNotify" :text="$t('notification.title')" :content="{ side: 'bottom' }">
        <div class="relative">
          <UButton icon="i-lucide-bell" color="neutral" variant="ghost" :aria-label="$t('notification.title')"
            @click="() => { showNotificationModal = true }" />
          <span v-if="unreadCounts.notifyUnread > 0"
            class="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold pointer-events-none">
            {{ unreadCounts.notifyUnread > 9 ? '9+' : unreadCounts.notifyUnread }}
          </span>
        </div>
      </UTooltip>

      <!-- 消息按钮 -->
      <UTooltip v-if="isLoggedIn && showMsg" :text="$t('message.title')" :content="{ side: 'bottom' }">
        <div class="relative">
          <UButton icon="i-lucide-message-square" color="neutral" variant="ghost" :aria-label="$t('message.title')"
            @click="() => { showMessageModal = true }" />
          <span v-if="unreadCounts.msgUnread > 0"
            class="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold pointer-events-none">
            {{ unreadCounts.msgUnread > 9 ? '9+' : unreadCounts.msgUnread }}
          </span>
        </div>
      </UTooltip>

      <!-- 头像左侧扩展插槽（业务模块注入入口，如 /chat） -->
      <slot name="header-actions" />

      <UButton v-if="!isLoggedIn" :label="$t('auth.login')" color="neutral" variant="ghost" icon="i-lucide-log-in"
        @click="() => { showLoginModal = true }" />

      <UDropdownMenu v-else :items="userMenuItems">
        <UButton color="neutral" variant="ghost" :label="user?.name" class="font-medium">
          <template #leading>
            <AvatarWithFrame :src="user?.avatarImg ?? undefined" :alt="user?.name" size="2xs" :text="user?.name?.charAt(0)" />
          </template>
        </UButton>
      </UDropdownMenu>
    </template>

    <!-- 移动端菜单内容插槽 -->
    <template #body>
      <slot name="nav-mobile" />
    </template>
  </UHeader>

  <!-- 以下弹窗都是「按需打开」且部分依赖很重（如导入用户带 xlsx、广播弹窗带富文本编辑器内核）
       统一用 Lazy 前缀 → Nuxt 生成 defineAsyncComponent（动态 import），
       避免它们的依赖被打进入口 chunk（entry 曾因此达到 5.4 MB / brotli 1.16 MB）。
       再加 v-if 门控：仅 Lazy 不够——组件若在 SSR 期间照常渲染，Nuxt 仍会把这些 chunk
       放进 modulepreload 阻塞首屏；未打开的弹窗不参与 SSR 渲染才真正移出关键路径。 -->
  <LazyAuthLoginModal v-if="showLoginModal" v-model:open="showLoginModal" />
  <LazyAuthProfileModal v-if="showProfileModal" v-model:open="showProfileModal" />
  <LazyAuthSettingsModal v-if="showSettingsModal" v-model:open="showSettingsModal" />
  <LazyAuthImportUsersModal v-if="showImportUsersModal" v-model:open="showImportUsersModal" />

  <!-- 通知弹窗 -->
  <LazyLayoutNotificationModal v-if="showNotificationModal" v-model:open="showNotificationModal" />

  <!-- 消息弹窗 -->
  <LazyLayoutMessageModal v-if="showMessageModal" v-model:open="showMessageModal" />

  <!-- 网盘文件弹窗 -->
  <LazyFilesMyFilesModal v-if="showMyFilesModal" v-model:open="showMyFilesModal" />

  <!-- 反馈弹窗 -->
  <LazyLayoutFeedbackModal v-if="showFeedbackModal" v-model:open="showFeedbackModal" />
</template>

<script setup lang="ts">
const {
  user, isLoggedIn, siteTitle, logo, showNotify, showMsg, unreadCounts,
  showLoginModal, showProfileModal, showSettingsModal, showNotificationModal,
  showMessageModal, showImportUsersModal, showMyFilesModal, showFeedbackModal, userMenuItems,
} = useHeaderMenu()
</script>
