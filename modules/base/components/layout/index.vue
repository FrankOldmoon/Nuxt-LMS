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

  <!-- 登录后全站显示的 Dify 悬浮聊天机器人 -->
  <LayoutDifyChat />
</template>
