/**
 * useAvatarFrame — 当前用户佩戴的头像框（全局共享状态）
 *
 * - frame: 当前佩戴框（'bronze' | 'silver' | 'gold' | null）
 * - equip(frame) / unequip(): 调 /api/users/avatar-frame 持久化并同步本地状态
 *
 * 登录时从 useAuth().user（/api/auth/me 返回 avatarFrame）初始化，
 * 任何头像展示组件调用 useAvatarFrame() 即可拿到佩戴状态。
 */
export function useAvatarFrame() {
  const { user } = useAuth()
  const toast = useToast()
  const { t } = useI18n()

  const frame = useState<string | null>('avatar-frame', () => null)

  // me 数据到位后同步
  watch(() => user.value?.avatarFrame, (val) => {
    if (val !== undefined && val !== frame.value) frame.value = val ?? null
  }, { immediate: true })

  async function equip(next: string | null) {
    const prev = frame.value
    frame.value = next
    try {
      const data = await cRequest<{ frame: string | null }>('/api/users/avatar-frame', {
        method: 'POST',
        body: { frame: next },
      })
      frame.value = data?.frame ?? next
      toast.add({ title: next ? t('avatarFrame.equipped') : t('avatarFrame.unequipped'), color: 'success' })
    } catch (e: any) {
      frame.value = prev
      toast.add({ title: e?.message || t('common.operationFailed'), color: 'error' })
    }
  }

  return { frame, equip }
}
