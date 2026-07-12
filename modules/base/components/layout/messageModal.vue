<template>
  <UModal v-model:open="isOpen" :ui="{ content: 'sm:max-w-2xl' }" scrollable>
    <template #content>
      <div class="flex" style="height: 70vh;">
        <LayoutMessageSidebar />
        <LayoutMessageChat />
      </div>
    </template>
  </UModal>
</template>

<script setup>
const isOpen = defineModel('open', { default: false })

const messages = useMessages(isOpen)
provideMessages(messages)
</script>
