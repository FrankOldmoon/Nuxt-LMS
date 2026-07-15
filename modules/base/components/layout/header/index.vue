<template>
  <UHeader :title="siteTitle" to="/">
    <template #left>
      <ULink to="/" class="flex items-center gap-2 font-bold text-lg text-highlighted" :aria-label="siteTitle">
        <img v-if="logo" :src="logo" alt="Logo" class="size-6 object-contain" />
        <UIcon v-else name="i-lucide-boxes" class="size-6 text-primary" />
        <span class="hidden sm:inline">{{ siteTitle }}</span>
      </ULink>
    </template>

    <!-- Center: navigation menu slot -->
    <slot name="nav" />

    <template #right>
      <!-- Right extension slot -->
      <slot name="header-right" />

      <UColorModeButton />

      <!-- Notification button -->
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

      <!-- Message button -->
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

    <!-- Mobile menu content slot -->
    <template #body>
      <slot name="nav-mobile" />
    </template>
  </UHeader>

  <AuthLoginModal v-model:open="showLoginModal" />
  <AuthProfileModal v-model:open="showProfileModal" />
  <AuthSettingsModal v-model:open="showSettingsModal" />
  <AuthImportUsersModal v-model:open="showImportUsersModal" />

  <!-- Notification modal -->
  <LayoutNotificationModal v-model:open="showNotificationModal" />

  <!-- Message modal -->
  <LayoutMessageModal v-model:open="showMessageModal" />

  <!-- Drive files modal -->
  <FilesMyFilesModal v-model:open="showMyFilesModal" />
</template>

<script setup lang="ts">
const {
  user, isLoggedIn, siteTitle, logo, showNotify, showMsg, unreadCounts,
  showLoginModal, showProfileModal, showSettingsModal, showNotificationModal,
  showMessageModal, showImportUsersModal, showMyFilesModal, userMenuItems,
} = useHeaderMenu()
</script>
