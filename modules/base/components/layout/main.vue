<template>
  <UPageBody>
    <!-- Page content -->
    <slot />

    <!-- WebSocket connection (base message/notification real-time communication) -->
    <LayoutWs />
  </UPageBody>
</template>
