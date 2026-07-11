<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <ULink to="/" class="inline-flex items-center gap-2 font-bold text-xl text-highlighted">
          <UIcon name="i-lucide-boxes" class="size-7 text-primary" />
          {{ siteTitle }}
        </ULink>
      </div>

      <UCard>
        <div class="p-2">
          <ResetPasswordForm :token="token" />
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { siteTitle } = useSiteConfig()

definePageMeta({
  layout: false,
})

const token = computed(() => String(route.query.token || ''))
</script>
