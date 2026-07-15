/**
 * Header: user menu + modal state + unread count listeners
 */
export function useHeaderMenu() {
  const { user, isLoggedIn, hasRole, logout } = useAuth()
  const toast = useToast()
  const { t } = useI18n()
  const { siteTitle, logo, showNotify, showMsg, showMyFiles } = useSiteConfig()
  const { counts: unreadCounts, refresh: refreshUnread } = useUnreadCounts()

  const showLoginModal = ref(false)
  const showProfileModal = ref(false)
  const showSettingsModal = ref(false)
  const showNotificationModal = ref(false)
  const showMessageModal = ref(false)
  const showImportUsersModal = ref(false)
  const showMyFilesModal = ref(false)

  // Fetch unread counts after login
  watch(isLoggedIn, (val) => {
    if (val) refreshUnread()
  }, { immediate: true })

  // Refresh unread counts after modal closes
  watch(showNotificationModal, (val) => {
    if (!val && isLoggedIn.value) refreshUnread()
  })

  watch(showMessageModal, (val) => {
    if (!val && isLoggedIn.value) refreshUnread()
  })

  const isAdmin = computed(() => hasRole('admin'))

  const userMenuItems = computed(() => {
    const items: any[] = [
      [
        {
          label: t('profile.title'),
          icon: 'i-lucide-user-circle',
          onSelect: () => {
            showProfileModal.value = true
          },
        },
      ],
    ]

    // "My Files" controlled by site:showMyFiles
    if (showMyFiles.value) {
      items[0].push({
        label: t('myFiles.title'),
        icon: 'i-lucide-hard-drive',
        onSelect: () => {
          showMyFilesModal.value = true
        },
      })
    }

    if (isAdmin.value) {
      items.push([
        {
          label: t('settings.title'),
          icon: 'i-lucide-settings',
          onSelect: () => {
            showSettingsModal.value = true
          },
        },
        {
          label: t('importUsers.title'),
          icon: 'i-lucide-users',
          onSelect: () => {
            showImportUsersModal.value = true
          },
        },
      ])
    }

    items.push([
      {
        label: t('auth.logout'),
        icon: 'i-lucide-log-out',
        onSelect: async () => {
          await logout()
          toast.add({ title: t('auth.logout'), color: 'neutral' })
        },
      },
    ])

    return items
  })

  return {
    user,
    isLoggedIn,
    siteTitle,
    logo,
    showNotify,
    showMsg,
    unreadCounts,
    showLoginModal,
    showProfileModal,
    showSettingsModal,
    showNotificationModal,
    showMessageModal,
    showImportUsersModal,
    showMyFilesModal,
    userMenuItems,
  }
}
