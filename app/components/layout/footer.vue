<template>
  <UFooter>
    <!-- 顶部：多列链接 -->
    <template #top>
      <UContainer class="grid grid-cols-2 gap-8 md:grid-cols-4">
        <!-- 品牌信息 -->
        <div class="col-span-2 md:col-span-1">
          <ULink to="/" class="flex items-center gap-2 font-bold text-lg text-highlighted">
            <UIcon name="i-lucide-boxes" class="size-6 text-primary" />
            <span>Nuxt Hub</span>
          </ULink>
          <p class="mt-2 text-sm text-muted">
            {{ $t('layout.footerDescription') }}
          </p>
        </div>

        <!-- 链接列 -->
        <div
          v-for="group in links"
          :key="group.label"
          class="flex flex-col gap-2"
        >
          <p class="text-sm font-semibold text-highlighted">
            {{ group.label }}
          </p>
          <UButton
            v-for="item in group.children"
            :key="item.label"
            :to="item.to"
            :icon="item.icon"
            :target="item.to.startsWith('http') ? '_blank' : undefined"
            color="neutral"
            variant="ghost"
            size="sm"
            :label="item.label"
            class="justify-start"
          />
        </div>
      </UContainer>
    </template>

    <!-- 左侧：版权信息 -->
    <template #left>
      <p class="text-sm text-muted">
        © {{ new Date().getFullYear() }} Nuxt Hub. {{ $t('layout.footerRights') }}
      </p>
    </template>

    <!-- 右侧：社交媒体链接 -->
    <template #right>
      <div class="flex items-center gap-1.5">
        <UButton
          to="https://github.com"
          target="_blank"
          icon="i-lucide-github"
          color="neutral"
          variant="ghost"
          size="sm"
          aria-label="GitHub"
        />
        <UButton
          to="https://x.com"
          target="_blank"
          icon="i-lucide-twitter"
          color="neutral"
          variant="ghost"
          size="sm"
          aria-label="X"
        />
        <UButton
          to="https://discord.com"
          target="_blank"
          icon="i-lucide-message-circle"
          color="neutral"
          variant="ghost"
          size="sm"
          aria-label="Discord"
        />
      </div>
    </template>
  </UFooter>
</template>

<script setup lang="ts">
const { links } = useFooterNav()
</script>
