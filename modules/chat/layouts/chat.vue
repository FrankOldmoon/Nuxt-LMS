<template>
  <!-- /chat 专用布局：header + 全宽三栏（lms 的 Layout 带 UContainer 限宽，不适合工作台） -->
  <div class="h-[100dvh] flex flex-col overflow-hidden">
    <LayoutHeader />
    <div class="flex-1 min-h-0">
      <slot />
    </div>
  </div>
</template>
