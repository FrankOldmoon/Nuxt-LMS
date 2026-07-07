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
</template>
