<template>
  <UAvatar
    :src="src"
    :alt="src"
    size="2xs"
    class="cursor-pointer"
    @click="previewImage = true"
  />
  <UModal v-model:open="previewImage">
    <template #content>
      <img :src="src" :alt="src" class="max-w-full max-h-[80vh] mx-auto" />
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  value: any
}>()

const previewImage = ref(false)
const src = computed(() => String(props.value))
</script>
