/**
 * course/view/index.vue component test
 * @see modules/lms/components/course/view/index.vue
 *
 * Course detail view: header + teacher team + content + chapter catalog
 * Key test: can mount, can receive props
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  // stub useCourseView
  ;(globalThis as any).useCourseView = (_props: any, _emit: any) => ({
    teachersModalOpen: ref(false),
    membersEl: ref(null),
    openTeachersModal: vi.fn(),
    closeTeachersModal: vi.fn(),
  })
  // stub useSiteConfig (base module composable, auto-import)
  ;(globalThis as any).useSiteConfig = () => ({
    siteTitle: ref('AI LMS'),
    config: ref({}),
  })
})

const _globalStubs = {
  UModal: {
    template: '<div v-if="open" class="modal"><slot name="content" /></div>',
    props: ['open', 'ui'],
  },
  UButton: {
    template: '<button class="ubutton" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>',
    props: ['label', 'icon', 'color', 'variant', 'size'],
  },
  UAvatar: {
    template: '<span class="uavatar">{{ alt || text }}</span>',
    props: ['src', 'alt', 'text', 'size'],
  },
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
  UCard: { template: '<div class="ucard"><slot /></div>', props: ['class', 'ui'] },
  NuxtLink: { template: '<a class="nuxt-link" :href="to"><slot /></a>', props: ['to'] },
  UBadge: {
    template: '<span class="ubadge">{{ label }}<slot /></span>',
    props: ['label', 'color', 'variant', 'size'],
  },
  UeditorRender: { template: '<div class="ueditor-render" />', props: ['json'] },
  CourseViewHeader: { template: '<div class="course-view-header" />', props: ['course', 'canEdit', 'courseId', 'firstChapterUrl', 'exporting'] },
  CourseEditorMembersManager: { template: '<div class="members-manager" />', props: ['courseId'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('course/view/index.vue', () => {
  const sampleCourse = {
    id: 1,
    title: 'Vue 基础',
    coverImg: 'cover.jpg',
    level: 'beginner',
    chapters: [{ id: 1 }, { id: 2 }],
    tags: ['前端'],
    teachers: [{ userId: 1, name: '张老师', username: 'zhang', avatarImg: 'a.jpg' }],
    content: { type: 'doc' },
  }

  it('course 存在时渲染视图', async () => {
    const { default: CourseView } = await import('../../../../components/course/view/index.vue')
    const wrapper = mount(CourseView, {
      props: {
        course: sampleCourse, canEdit: false, courseId: '1',
        firstChapterUrl: '', exporting: false, pending: false,
        chapterTree: [], hasContent: true, canManageTeachers: false,
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.course-view-header').exists()).toBe(true)
  })

  it('course 为 null 且 pending=false 时显示未找到', async () => {
    const { default: CourseView } = await import('../../../../components/course/view/index.vue')
    const wrapper = mount(CourseView, {
      props: {
        course: null, canEdit: false, courseId: '1',
        firstChapterUrl: '', exporting: false, pending: false,
        chapterTree: [], hasContent: false, canManageTeachers: false,
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('course.notFound')
  })

  it('有教师时渲染教师团队区域', async () => {
    const { default: CourseView } = await import('../../../../components/course/view/index.vue')
    const wrapper = mount(CourseView, {
      props: {
        course: sampleCourse, canEdit: false, courseId: '1',
        firstChapterUrl: '', exporting: false, pending: false,
        chapterTree: [], hasContent: false, canManageTeachers: false,
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('course.teachingTeam')
    expect(wrapper.text()).toContain('张老师')
  })

  it('canManageTeachers=true 时渲染管理教师按钮', async () => {
    const { default: CourseView } = await import('../../../../components/course/view/index.vue')
    const wrapper = mount(CourseView, {
      props: {
        course: sampleCourse, canEdit: true, courseId: '1',
        firstChapterUrl: '', exporting: false, pending: false,
        chapterTree: [], hasContent: false, canManageTeachers: true,
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('course.manageTeachers')
  })

  it('hasContent=true 时渲染课程内容', async () => {
    const { default: CourseView } = await import('../../../../components/course/view/index.vue')
    const wrapper = mount(CourseView, {
      props: {
        course: sampleCourse, canEdit: false, courseId: '1',
        firstChapterUrl: '', exporting: false, pending: false,
        chapterTree: [], hasContent: true, canManageTeachers: false,
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('course.aboutCourse')
    expect(wrapper.find('.ueditor-render').exists()).toBe(true)
  })

  it('渲染章节目录', async () => {
    const { default: CourseView } = await import('../../../../components/course/view/index.vue')
    const wrapper = mount(CourseView, {
      props: {
        course: sampleCourse, canEdit: false, courseId: '1',
        firstChapterUrl: '', exporting: false, pending: false,
        chapterTree: [{ id: 1, label: '第一章', to: '/c/1/1' }], hasContent: false, canManageTeachers: false,
      },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('course.chapterList')
    expect(wrapper.text()).toContain('第一章')
  })
})
