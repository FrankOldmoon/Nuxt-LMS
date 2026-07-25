<template>
  <UPageBody>
    <!-- 页面内容 -->
    <slot />

    <!-- WebSocket 连接（base 的消息/通知实时通信） -->
    <LayoutWs />
  </UPageBody>
</template>
