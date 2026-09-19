/**
 * AvatarWithFrame 组件测试
 * @see modules/lms/components/AvatarWithFrame.vue
 *
 * 头像可见性规则（与服务端 file API 鉴权一致）：
 * - 教师及以上：可见任意人的真实头像与头像框
 * - 学生 / 访客：仅可见「自己的」真实头像；他人一律降级为字母头像（src 置空）
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockAuthUser } from '../../../../test/setup/nuxt-stubs'

const MY_AVATAR = '/api/files/serve?pathname=221%2Fme.webp'
const OTHER_AVATAR = '/api/files/serve?pathname=221%2Fother.webp'

beforeEach(() => {
  resetAllStubs()
  ;(globalThis as any).useAvatarFrame = () => ({ frame: ref(null) })
})

const globalConfig = {
  stubs: {
    UAvatar: {
      template: '<span class="uavatar" :data-src="src || \'\'" :data-text="text || \'\'" />',
      props: ['src', 'alt', 'text', 'size'],
    },
    AvatarFrame: {
      template: '<span class="avatar-frame" :data-frame="frame || \'\'" />',
      props: ['frame'],
    },
  },
}

async function mountAvatar(props: Record<string, any>) {
  const { default: Comp } = await import('../../components/AvatarWithFrame.vue')
  return mount(Comp, { props, global: globalConfig })
}

describe('AvatarWithFrame - 头像可见性', () => {
  it('学生：他人真实头像不加载（src 置空 → 字母头像）', async () => {
    setMockAuthUser({ id: 1, name: 'Me', avatarImg: MY_AVATAR }, [{ code: 'student' }], [])
    const w = await mountAvatar({ src: OTHER_AVATAR, text: 'O', userId: 2 })
    expect(w.find('.uavatar').attributes('data-src')).toBe('')
    expect(w.find('.uavatar').attributes('data-text')).toBe('O')
  })

  it('学生：自己的头像正常加载', async () => {
    setMockAuthUser({ id: 1, name: 'Me', avatarImg: MY_AVATAR }, [{ code: 'student' }], [])
    const w = await mountAvatar({ src: MY_AVATAR, text: 'M' })
    expect(w.find('.uavatar').attributes('data-src')).toBe(MY_AVATAR)
  })

  it('教师：任意人真实头像都可加载', async () => {
    setMockAuthUser({ id: 9, name: 'T', avatarImg: null }, [{ code: 'teacher' }], [])
    const w = await mountAvatar({ src: OTHER_AVATAR, userId: 2 })
    expect(w.find('.uavatar').attributes('data-src')).toBe(OTHER_AVATAR)
  })
})

describe('AvatarWithFrame - 头像框可见性', () => {
  it('学生：本人佩戴的框正常显示', async () => {
    setMockAuthUser({ id: 1, name: 'Me', avatarImg: MY_AVATAR }, [{ code: 'student' }], [])
    ;(globalThis as any).useAvatarFrame = () => ({ frame: ref('gold') })
    const w = await mountAvatar({ src: MY_AVATAR })
    expect(w.find('.avatar-frame').attributes('data-frame')).toBe('gold')
  })

  it('学生：他人头像框隐藏', async () => {
    setMockAuthUser({ id: 1, name: 'Me', avatarImg: MY_AVATAR }, [{ code: 'student' }], [])
    const w = await mountAvatar({ src: OTHER_AVATAR, userId: 2, frame: 'gold' })
    expect(w.find('.avatar-frame').exists()).toBe(false)
  })

  it('教师：他人头像框正常显示', async () => {
    setMockAuthUser({ id: 9, name: 'T', avatarImg: null }, [{ code: 'teacher' }], [])
    const w = await mountAvatar({ src: OTHER_AVATAR, userId: 2, frame: 'gold' })
    expect(w.find('.avatar-frame').attributes('data-frame')).toBe('gold')
  })
})
