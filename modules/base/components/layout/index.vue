<template>
  <LayoutHeader />

  <UMain>
    <UContainer>
      <UPage>
        <!-- Center: main content area -->
        <LayoutMain>
          <slot />
        </LayoutMain>
      </UPage>
    </UContainer>
  </UMain>

  <LayoutFooter />
</template>
