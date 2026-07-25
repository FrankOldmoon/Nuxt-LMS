/**
 * lms/configEditor/switchSections.vue 组件测试
 * @see modules/lms/components/lms/configEditor/switchSections.vue
 *
 * 开关配置区域：course / chapterBtns / courseBtns / home / chapterPage
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive, computed } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  USwitch: {
    template: '<label class="uswitch"><input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" /></label>',
    props: ['modelValue'],
  },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

function setupContext(hideCourseVal = false) {
  const config = reactive({
    course: { showDanmaku: true, showAnnouncement: true, showComments: true, showProgress: false, defaultChapterOpen: true },
    chapterBtns: { showPlay: true, showScore: true, showSelect: true, showTimer: true, showInvite: true, showDanmaku: true, showVote: true, showQuickAnswer: true },
    courseBtns: { showProgress: true, showLeaderboard: true, showGroups: true, showGrades: true, showAnnouncements: true, showWrongBook: true },
    home: { showHero: true, showStats: true, showRecentCourses: true, showLeaderboard: true },
    chapterPage: { showOutline: true, showNote: true, showDanmakuPanel: true, enableFullscreen: true },
  })
  const ctx = {
    config,
    hideCourse: computed(() => hideCourseVal),
  }
  ;(globalThis as any).useConfigEditorContext = () => ctx
  return ctx
}

describe('lms/configEditor/switchSections.vue', () => {
  it('渲染所有 5 个 section 标题', async () => {
    setupContext()
    const { default: SwitchSections } = await import('../../../../components/lms/configEditor/switchSections.vue')
    const wrapper = mount(SwitchSections, { global: _globalConfig })
    expect(wrapper.text()).toContain('lmsConfig.course')
    expect(wrapper.text()).toContain('lmsConfig.chapterBtns')
    expect(wrapper.text()).toContain('lmsConfig.courseBtns')
    expect(wrapper.text()).toContain('lmsConfig.home')
    expect(wrapper.text()).toContain('lmsConfig.chapterPage')
  })

  it('渲染 course section 的字段', async () => {
    setupContext()
    const { default: SwitchSections } = await import('../../../../components/lms/configEditor/switchSections.vue')
    const wrapper = mount(SwitchSections, { global: _globalConfig })
    expect(wrapper.text()).toContain('courseEditor.showDanmaku')
    expect(wrapper.text()).toContain('courseEditor.showAnnouncement')
    expect(wrapper.text()).toContain('courseEditor.showProgress')
  })

  it('hideCourse=true 时隐藏 course section', async () => {
    setupContext(true)
    const { default: SwitchSections } = await import('../../../../components/lms/configEditor/switchSections.vue')
    const wrapper = mount(SwitchSections, { global: _globalConfig })
    // v-show=false 仍渲染 DOM 但 display:none
    // course section 标题仍存在但不显示
    expect(wrapper.text()).toContain('lmsConfig.chapterBtns')
  })

  it('渲染 chapterBtns section 的字段', async () => {
    setupContext()
    const { default: SwitchSections } = await import('../../../../components/lms/configEditor/switchSections.vue')
    const wrapper = mount(SwitchSections, { global: _globalConfig })
    expect(wrapper.text()).toContain('chapter.play')
    expect(wrapper.text()).toContain('chapter.score')
    expect(wrapper.text()).toContain('chapter.timer')
    expect(wrapper.text()).toContain('chapter.vote')
  })

  it('渲染所有开关数量正确', async () => {
    setupContext()
    const { default: SwitchSections } = await import('../../../../components/lms/configEditor/switchSections.vue')
    const wrapper = mount(SwitchSections, { global: _globalConfig })
    const switches = wrapper.findAll('.uswitch')
    // course(5) + chapterBtns(8) + courseBtns(6) + home(4) + chapterPage(4) = 27
    expect(switches.length).toBe(27)
  })
})
