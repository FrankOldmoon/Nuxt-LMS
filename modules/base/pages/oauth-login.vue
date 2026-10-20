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
          <AuthLoginForm @success="onSuccess" />
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * OAuth 授权流程专用登录页
 *
 * 只在 /api/oauth/authorize 遇到未登录时跳到这里（?redirect=<authorize 的相对路径>）。
 * 登录成功后原路返回，把用户送回 authorize 继续发 code —— 不能跳首页，
 * 否则第三方系统那边拿不到 code，登录就断了。
 */
definePageMeta({
  layout: false,
})

const route = useRoute()
const { siteTitle } = useSiteConfig()

function onSuccess() {
  const raw = String(route.query.redirect || '/')
  // 只接受站内绝对路径；排除 //evil.com 这类协议相对跳转
  const safe = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/'
  // 必须整页跳转（window.location），不能用 navigateTo：
  // redirect 指向的是 /api/oauth/authorize 这类 Nitro 接口路由，没有对应的页面路由，
  // 走 vue-router 的 SPA 导航会被判成 404（表现为登录成功后出现 "Page not found"）。
  window.location.replace(safe)
}
</script>
