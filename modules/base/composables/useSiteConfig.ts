export function useSiteConfig() {
  const { data, refresh } = useFetch('/api/site-config')
  const siteTitle = computed(() => data.value?.siteTitle || 'AI LMS')
  const logo = computed(() => data.value?.siteLogo || '')
  const allowRegistration = computed(() => data.value?.allowRegistration ?? true)
  return { siteTitle, logo, allowRegistration, config: data, refreshConfig: refresh }
}
