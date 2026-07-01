<template>
  <UNavigationMenu
    :items="links"
    :orientation="orientation"
    :highlight="highlight"
    :content-orientation="orientation === 'horizontal' ? 'vertical' : 'vertical'"
    color="primary"
    variant="pill"
  />
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  orientation?: 'horizontal' | 'vertical'
  highlight?: boolean
}>(), {
  orientation: 'horizontal',
  highlight: true,
})

const { links } = useHeaderNav()
</script>
