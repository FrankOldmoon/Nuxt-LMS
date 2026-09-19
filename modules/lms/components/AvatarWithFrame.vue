<template>
  <!-- 带头像框的用户头像：UAvatar + 覆盖 AvatarFrame（当前用户自动读全局佩戴状态） -->
  <div class="relative inline-flex shrink-0" :style="{ width: sizeClass, height: sizeClass }">
    <UAvatar
      :src="effectiveSrc"
      :alt="alt"
      :text="text"
      class="!w-full !h-full"
      :class="shapeClass"
    />
    <AvatarFrame
      v-if="effectiveFrame"
      :frame="effectiveFrame"
      class="absolute inset-0 h-full w-full"
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  src?: string | null
  alt?: string
  text?: string
  /** 显式指定框（他人头像时传入），缺省取当前用户全局佩戴状态 */
  frame?: string | null
  /** 指定用户 id：等于当前用户时也走全局佩戴状态 */
  userId?: number
  /** UAvatar size 别名（xs/sm/md/lg/xl/2xl）或任意像素字符串 */
  size?: string
  shape?: 'circle' | 'square'
}>()

const { user, canViewAvatars } = useAuth()
const { frame: myFrame } = useAvatarFrame()

const SIZES: Record<string, string> = {
  '3xs': '20px', '2xs': '24px', xs: '32px', sm: '40px', md: '48px', lg: '56px', xl: '64px', '2xl': '80px', '3xl': '96px',
}
const sizeClass = computed(() => {
  if (!props.size) return '48px'
  return SIZES[props.size] || props.size
})

const shapeClass = computed(() => (props.shape === 'square' ? 'rounded-lg' : 'rounded-full'))

// 自己的头像始终可见；他人真实头像需教师及以上权限（与服务端 file API 鉴权一致）
const isOwnAvatar = computed(() => !!props.src && props.src === (user.value?.avatarImg || undefined))
const effectiveSrc = computed(() =>
  (canViewAvatars.value || isOwnAvatar.value) ? (props.src || undefined) : undefined,
)

// 他人头像框：无查看权限则隐藏；自己 / 未指定 userId 时使用全局佩戴框
const isOtherUser = computed(() => !!props.userId && props.userId !== user.value?.id)
const effectiveFrame = computed(() => {
  if (isOtherUser.value && !canViewAvatars.value) return null
  if (props.frame !== undefined && props.frame !== null) return props.frame
  if (isOtherUser.value) return null
  return myFrame.value || null
})
</script>
