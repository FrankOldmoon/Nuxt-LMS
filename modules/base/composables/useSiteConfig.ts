export function useSiteConfig() {
  const { data, refresh } = useFetch('/api/site-config')
  const siteTitle = computed(() => data.value?.siteTitle || 'Nuxt Hub')
  const logo = computed(() => data.value?.siteLogo || '')
  return { siteTitle, logo, config: data, refreshConfig: refresh }
}
