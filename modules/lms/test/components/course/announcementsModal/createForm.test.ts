/**
 * course/announcementsModal/createForm.vue component test
 * @see modules/lms/components/course/announcementsModal/createForm.vue
 *
 * New announcement form: canCreate controls display, showCreateForm toggles form expansion
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UButton: {
    template: '<button class="ubutton" :data-loading="loading" :data-disabled="disabled" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>',
    props: ['icon', 'label', 'color', 'variant', 'size', 'loading', 'disabled'],
  },
  UInput: {
    template: '<input class="uinput" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder', 'ui'],
  },
  UTextarea: {
    template: '<textarea class="utextarea" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'rows'],
  },
  UFormField: {
    template: '<div class="uform-field"><label v-if="label">{{ label }}</label><slot /></div>',
    props: ['label', 'required'],
  },
  UCheckbox: {
    template: '<label class="ucheckbox-label"><input type="checkbox" class="ucheckbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" /> {{ label }}</label>',
    props: ['modelValue', 'label'],
  },
  RichEditor: {
    template: '<div class="rich-editor" />',
  },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

function setupContext(overrides: any = {}) {
  const ctx = {
    canCreate: ref(true),
    showCreateForm: ref(false),
    form: ref({ name: '', contentText: '', classIds: [] as number[] }),
    classes: ref([
      { id: 1, name: '一班' },
      { id: 2, name: '二班' },
    ]),
    creating: ref(false),
    toggleClass: vi.fn(),
    toggleCreateForm: vi.fn(() => {}),
    createAnnouncement: vi.fn(),
    ...overrides,
  }
  ;(globalThis as any).useAnnouncementsContext = () => ctx
  return ctx
}

describe('course/announcementsModal/createForm.vue', () => {
  it('canCreate=false 时不渲染', async () => {
    setupContext({ canCreate: ref(false) })
    const { default: CreateForm } = await import('../../../../components/course/announcementsModal/createForm.vue')
    const wrapper = mount(CreateForm, { global: _globalConfig })
    expect(wrapper.find('.ubutton').exists()).toBe(false)
  })

  it('canCreate=true 时渲染新建按钮', async () => {
    setupContext()
    const { default: CreateForm } = await import('../../../../components/course/announcementsModal/createForm.vue')
    const wrapper = mount(CreateForm, { global: _globalConfig })
    expect(wrapper.find('.ubutton').exists()).toBe(true)
    expect(wrapper.text()).toContain('announcement.new')
  })

  it('showCreateForm=false 时不渲染表单', async () => {
    setupContext({ showCreateForm: ref(false) })
    const { default: CreateForm } = await import('../../../../components/course/announcementsModal/createForm.vue')
    const wrapper = mount(CreateForm, { global: _globalConfig })
    expect(wrapper.find('.uform-field').exists()).toBe(false)
  })

  it('showCreateForm=true 时渲染表单字段', async () => {
    setupContext({ showCreateForm: ref(true) })
    const { default: CreateForm } = await import('../../../../components/course/announcementsModal/createForm.vue')
    const wrapper = mount(CreateForm, { global: _globalConfig })
    expect(wrapper.find('.uform-field').exists()).toBe(true)
    expect(wrapper.text()).toContain('announcement.name')
    expect(wrapper.text()).toContain('announcement.content')
    expect(wrapper.text()).toContain('announcement.targetClasses')
  })

  it('渲染班级 checkbox 列表', async () => {
    setupContext({ showCreateForm: ref(true) })
    const { default: CreateForm } = await import('../../../../components/course/announcementsModal/createForm.vue')
    const wrapper = mount(CreateForm, { global: _globalConfig })
    const checkboxes = wrapper.findAll('.ucheckbox')
    expect(checkboxes.length).toBe(2)
  })

  it('classes 为空时显示提示', async () => {
    setupContext({ showCreateForm: ref(true), classes: ref([]) })
    const { default: CreateForm } = await import('../../../../components/course/announcementsModal/createForm.vue')
    const wrapper = mount(CreateForm, { global: _globalConfig })
    expect(wrapper.text()).toContain('announcement.noClasses')
  })

  it('creating=true 时发布按钮显示 loading', async () => {
    setupContext({ showCreateForm: ref(true), creating: ref(true) })
    const { default: CreateForm } = await import('../../../../components/course/announcementsModal/createForm.vue')
    const wrapper = mount(CreateForm, { global: _globalConfig })
    // Find the publish button (the last ubutton)
    const buttons = wrapper.findAll('.ubutton')
    const publishBtn = buttons[buttons.length - 1]!
    expect(publishBtn.attributes('data-loading')).toBe('true')
  })
})
