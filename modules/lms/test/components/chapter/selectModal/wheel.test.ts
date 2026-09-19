/**
 * selectModal/wheel.vue 组件测试
 * @see modules/lms/components/chapter/selectModal/wheel.vue
 *
 * 彩色大转盘：扇区渲染 / 中心按钮开转 / 点击扇区手动选人 / 中奖卡片放大 + 烟花。
 * AuthUserCard 与 Fireworks 在测试中 stub，避免依赖头像与 canvas。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { resetAllStubs, setMockI18n, setMockAuthUser } from '../../../../../../test/setup/nuxt-stubs'
import { WHEEL_COLORS } from '../../../../components/chapter/selectModal/useWheel'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

afterEach(() => {
  vi.useRealTimers()
})

const _globalStubs = {
  AuthUserCard: { template: '<div class="user-card" />', props: ['user', 'selected', 'size'] },
  Fireworks: { template: '<div class="fireworks" />', props: [], emits: ['done'] },
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

const USERS = [
  { id: 1, name: '张三', avatarImg: '/api/files/serve?pathname=avatar-1.png' },
  { id: 2, name: '李四' },
]

async function mountWheel(props: any = {}) {
  const { default: Wheel } = await import('../../../../components/chapter/selectModal/wheel.vue')
  return mount(Wheel, {
    props: { users: USERS, ...props },
    global: _globalConfig,
  })
}

describe('chapter/selectModal/wheel.vue', () => {
  it('每个学生一个扇区，按调色板循环取色并显示姓名', async () => {
    const wrapper = await mountWheel()
    const sectors = wrapper.findAll('.wheel-sector')
    expect(sectors.length).toBe(2)
    expect(sectors[0]!.attributes('fill')).toBe(WHEEL_COLORS[0])
    expect(sectors[1]!.attributes('fill')).toBe(WHEEL_COLORS[1])
    expect(wrapper.findAll('.wheel-label').map(l => l.text())).toEqual(['张三', '李四'])
  })

  it('已选学生扇区高亮', async () => {
    const wrapper = await mountWheel({ selectedIds: [2] })
    const sectors = wrapper.findAll('.wheel-sector')
    expect(sectors[0]!.classes()).not.toContain('wheel-sector-selected')
    expect(sectors[1]!.classes()).toContain('wheel-sector-selected')
  })

  it('有头像的学生在扇区内渲染圆形头像，无头像时降级为首字圆牌', async () => {
    // 真实头像仅教师及以上可见（与 file API 头像鉴权一致）
    setMockAuthUser({ id: 9, name: 'Teacher' }, [{ code: 'teacher' }], [])
    const wrapper = await mountWheel()
    const avatars = wrapper.findAll('.wheel-avatar')
    expect(avatars.length).toBe(1)
    expect(avatars[0]!.attributes('href')).toBe('/api/files/serve?pathname=avatar-1.png')
    expect(avatars[0]!.attributes('clip-path')).toBe('url(#wheel-avatar-clip)')

    // 圆形遮罩：以外接框为单位的内切圆，图片为正方形 → 裁出来一定是圆，不是长方形
    const clip = wrapper.find('#wheel-avatar-clip')
    expect(clip.attributes('clipPathUnits')).toBe('objectBoundingBox')
    const clipCircle = clip.find('circle')
    expect(clipCircle.attributes('cx')).toBe('0.5')
    expect(clipCircle.attributes('cy')).toBe('0.5')
    expect(clipCircle.attributes('r')).toBe('0.5')

    // 2 人时头像半径 24 → 图片 48×48，x/y 为 -24（正方形不变形）
    expect(avatars[0]!.attributes('width')).toBe('48')
    expect(avatars[0]!.attributes('height')).toBe('48')
    expect(avatars[0]!.attributes('x')).toBe('-24')
    expect(avatars[0]!.attributes('y')).toBe('-24')

    const fallback = wrapper.findAll('.wheel-avatar-text')
    expect(fallback.length).toBe(1)
    expect(fallback[0]!.text()).toBe('李')
  })

  it('学生视角不渲染真实头像（全部降级为首字圆牌）', async () => {
    setMockAuthUser({ id: 1, name: 'Student' }, [{ code: 'student' }], [])
    const wrapper = await mountWheel()
    expect(wrapper.findAll('.wheel-avatar').length).toBe(0)
    expect(wrapper.findAll('.wheel-avatar-text').map(t => t.text())).toEqual(['张', '李'])
  })

  it('学生本人可看到自己的头像（他人仍降级为首字）', async () => {
    const mine = { id: 1, name: '张三', avatarImg: '/api/files/serve?pathname=avatar-1.png' }
    const other = { id: 2, name: '李四', avatarImg: '/api/files/serve?pathname=avatar-2.png' }
    setMockAuthUser({ id: 1, name: '张三', avatarImg: mine.avatarImg }, [{ code: 'student' }], [])
    const wrapper = await mountWheel({ users: [mine, other] })
    const avatars = wrapper.findAll('.wheel-avatar')
    expect(avatars.length).toBe(1)
    expect(avatars[0]!.attributes('href')).toBe(mine.avatarImg)
    expect(wrapper.findAll('.wheel-avatar-text').map(t => t.text())).toEqual(['李'])
  })

  it('头像圆心比姓名更靠内（姓名排在头像外侧）', async () => {
    const wrapper = await mountWheel()
    const face = wrapper.find('.wheel-face').attributes('transform')!
    const [, fx, fy] = face.match(/translate\(([-\d.]+), ([-\d.]+)\)/)!
    const faceDist = Math.hypot(Number(fx) - 180, Number(fy) - 180)
    expect(faceDist).toBeCloseTo(106, 1)

    const label = wrapper.find('.wheel-label')
    const labelDist = Math.hypot(
      Number(label.attributes('x')) - 180,
      Number(label.attributes('y')) - 180,
    )
    expect(labelDist).toBeGreaterThan(faceDist)
    // 姓名仍落在扇区外径以内
    expect(labelDist).toBeLessThan(166)
  })

  it('点击中心按钮触发 spin', async () => {
    const wrapper = await mountWheel()
    await wrapper.find('.wheel-hub').trigger('click')
    expect(wrapper.emitted('spin')).toHaveLength(1)
  })

  it('点击扇区手动选人：emit pick(user) 并转向该扇区', async () => {
    const wrapper = await mountWheel()
    expect((wrapper.find('.wheel-rotor').element as HTMLElement).style.transform).toContain('rotate(0deg)')

    await wrapper.findAll('.wheel-sector')[1]!.trigger('click')
    await nextTick()

    const picked = wrapper.emitted('pick')
    expect(picked).toHaveLength(1)
    expect(picked![0]![0]).toEqual(USERS[1])
    // total=2 index=1 → mid=270 → 目标角 90，手动转向只多转一圈
    expect((wrapper.find('.wheel-rotor').element as HTMLElement).style.transform).toContain('rotate(450deg)')
  })

  it('旋转过程中点击扇区不再触发 pick', async () => {
    const wrapper = await mountWheel({ spinning: true })
    await wrapper.findAll('.wheel-sector')[0]!.trigger('click')
    expect(wrapper.emitted('pick')).toBeUndefined()
  })

  it('winner + celebrate：渲染放大的卡片与烟花', async () => {
    const wrapper = await mountWheel({ winner: USERS[0], celebrate: true })
    expect(wrapper.find('.user-card').exists()).toBe(true)
    expect(wrapper.find('.fireworks').exists()).toBe(true)
  })

  it('无 winner 时不渲染中奖卡片', async () => {
    const wrapper = await mountWheel()
    expect(wrapper.find('.user-card').exists()).toBe(false)
    expect(wrapper.find('.fireworks').exists()).toBe(false)
  })

  it('烟花播放结束转发 celebrateEnd', async () => {
    const wrapper = await mountWheel({ winner: USERS[0], celebrate: true })
    await wrapper.findComponent(_globalStubs.Fireworks).vm.$emit('done')
    expect(wrapper.emitted('celebrateEnd')).toHaveLength(1)
  })

  it('spinTo：转到目标扇区并在动画结束后 resolve', async () => {
    vi.useFakeTimers()
    const wrapper = await mountWheel()
    const done = wrapper.vm.spinTo(1, 2)
    await nextTick()
    expect((wrapper.find('.wheel-rotor').element as HTMLElement).style.transform).toContain('1890')

    vi.advanceTimersByTime(3600)
    await expect(done).resolves.toBeUndefined()
  })
})
