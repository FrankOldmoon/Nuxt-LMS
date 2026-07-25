<template>
  <div class="min-h-screen flex flex-col">
    <!-- admin 顶栏（替代 base 的 LayoutHeader，不含导航/搜索） -->
    <header class="border-b border-default bg-default">
      <UContainer class="flex items-center justify-between h-14">
        <h1 class="text-lg font-semibold">{{ t('admin.title') }}</h1>
        <UButton
          icon="i-lucide-arrow-left"
          variant="ghost"
          size="sm"
          :label="t('admin.backToSite')"
          to="/"
        />
      </UContainer>
    </header>

    <!-- 左菜单 + 右内容（沿用原 dashboard.vue 的 grid 结构） -->
    <UContainer class="flex-1 py-4">
      <div class="lg:grid lg:grid-cols-[240px_1fr] lg:gap-4">
        <div class="mb-2 lg:mb-0 lg:sticky lg:top-4 lg:h-[calc(100vh-8rem)] lg:overflow-y-auto">
          <MenuNavigation />
        </div>
        <main class="min-w-0 overflow-hidden">
          <slot />
        </main>
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
// 显式触发 useAuth → SSR 期 useFetch('/api/auth/me') 转发 Cookie 拉取用户，
// 序列化到 payload 让客户端 admin-guard 同步读到 isLoggedIn，避免直接 SSR 进入 /dashboard/* 被重定向到 /。
useAuth()
</script>
