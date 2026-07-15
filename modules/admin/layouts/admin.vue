<template>
  <div class="min-h-screen flex flex-col">
    <!-- Admin top bar (replaces base's LayoutHeader, no navigation/search) -->
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

    <!-- Left menu + right content (follows original dashboard.vue grid structure) -->
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
// Explicitly trigger useAuth → during SSR useFetch('/api/auth/me') forwards Cookie to fetch user,
// serialized to payload so client admin-guard synchronously reads isLoggedIn, avoiding direct SSR entry to /dashboard/* being redirected to /.
useAuth()
</script>
