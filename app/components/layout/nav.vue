<template>
  <UNavigationMenu
    :items="links"
    :orientation="orientation"
    :highlight="highlight"
    :content-orientation="orientation === 'horizontal' ? 'vertical' : 'vertical'"
    color="primary"
    variant="pill"
  />
  <LayoutNavigationEditor
    v-if="hasRole('admin')"
    mode="category"
    :navigation="links.slice(1)"
    @saved="handleSaved"
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

const { hasRole } = useAuth()
const { links, refresh } = useHeaderNav()

async function handleSaved() {
  if (refresh) {
    await refresh()
  }
}
</script>
