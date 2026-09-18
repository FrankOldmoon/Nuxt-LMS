<template>
  <LayoutHeader />

  <UMain>
    <UContainer>
      <UPage>
        <!-- 中间：主内容区 -->
        <LayoutMain>
          <slot />
        </LayoutMain>
      </UPage>
    </UContainer>
  </UMain>

  <LayoutFooter />

  <!-- 登录后全站显示的 Dify 悬浮聊天机器人
       Lazy：聊天机器人依赖 AI 相关库且只在登录后才有用，动态 import 避免污染入口 chunk -->
  <LazyLayoutDifyChat />
</template>
