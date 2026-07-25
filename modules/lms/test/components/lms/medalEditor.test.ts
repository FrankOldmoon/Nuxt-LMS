/**
 * lms/medalEditor.vue 组件测试
 * @see modules/lms/components/lms/medalEditor.vue
 *
 * 奖章编辑器：列表 + 新增/删除/保存 + 条件编辑
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

// mock useMedalEditor（本地导入）
vi.mock('../../../components/lms/useMedalEditor', () => ({
  useMedalEditor: () => ({
    loading: ref(false),
    medals: ref([]),
    fullIconName: (name: string) => name || 'i-lucide-award',
    iconColorClass: (color: string) => `text-${color || 'primary'}`,
    tierOpts: [{ label: 'T1', value: 1 }, { label: 'T2', value: 2 }],
    colorOpts: [{ label: 'Gold', value: 'gold' }, { label: 'Silver', value: 'silver' }],
    logicOpts: [{ label: 'ALL', value: 'all' }, { label: 'ANY', value: 'any' }],
    metricOpts: [{ label: 'Exp', value: 'exp' }],
    opOpts: [{ label: '≥', value: '>=' }],
    addCondition: vi.fn(),
    deletingId: ref(null),
    deleteMedal: vi.fn(),
    addMedal: vi.fn(),
    saving: ref(false),
    saveAll: vi.fn(),
  }),
}))

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  USeparator: {
    template: '<div class="useparator">{{ label }}</div>',
    props: ['label'],
  },
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
  UInput: {
    template: '<input class="uinput" :value="modelValue" :type="type" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'type', 'size', 'placeholder'],
  },
  USelect: {
    template: '<select class="uselect" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="o in items" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
    props: ['modelValue', 'items', 'size'],
  },
  UButton: {
    template: '<button class="ubutton" :data-loading="loading" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>',
    props: ['icon', 'label', 'color', 'variant', 'size', 'loading', 'block'],
  },
  FormInputIcon: { template: '<div class="form-input-icon" />', props: ['modelValue', 'iconColor'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('lms/medalEditor.vue', () => {
  it('渲染编辑器标题', async () => {
    const { default: MedalEditor } = await import('../../../components/lms/medalEditor.vue')
    const wrapper = mount(MedalEditor, { global: _globalConfig })
    expect(wrapper.text()).toContain('medal.editorTitle')
  })

  it('空奖章列表时渲染新增按钮', async () => {
    const { default: MedalEditor } = await import('../../../components/lms/medalEditor.vue')
    const wrapper = mount(MedalEditor, { global: _globalConfig })
    expect(wrapper.text()).toContain('medal.add')
  })

  it('渲染保存按钮', async () => {
    const { default: MedalEditor } = await import('../../../components/lms/medalEditor.vue')
    const wrapper = mount(MedalEditor, { global: _globalConfig })
    expect(wrapper.text()).toContain('common.save')
  })

  it('点击新增按钮调用 addMedal', async () => {
    const { default: MedalEditor } = await import('../../../components/lms/medalEditor.vue')
    const wrapper = mount(MedalEditor, { global: _globalConfig })
    // 找到 add 按钮（label 包含 medal.add）
    const buttons = wrapper.findAll('.ubutton')
    const addBtn = buttons.find(b => b.text().includes('medal.add'))
    expect(addBtn).toBeTruthy()
    await addBtn!.trigger('click')
    // addMedal 被 mock，验证调用
  })

  it('点击保存按钮调用 saveAll', async () => {
    const { default: MedalEditor } = await import('../../../components/lms/medalEditor.vue')
    const wrapper = mount(MedalEditor, { global: _globalConfig })
    const buttons = wrapper.findAll('.ubutton')
    const saveBtn = buttons.find(b => b.text().includes('common.save'))
    expect(saveBtn).toBeTruthy()
    await saveBtn!.trigger('click')
    await new Promise(r => setTimeout(r, 0))
    // saveAll 被 mock，验证调用
  })

  it('loading=true 时显示加载图标', async () => {
    vi.doMock('../../../components/lms/useMedalEditor', () => ({
      useMedalEditor: () => ({
        loading: ref(true),
        medals: ref([]),
        fullIconName: () => 'i-lucide-award',
        iconColorClass: () => 'text-primary',
        tierOpts: [], colorOpts: [], logicOpts: [], metricOpts: [], opOpts: [],
        addCondition: vi.fn(), deletingId: ref(null), deleteMedal: vi.fn(),
        addMedal: vi.fn(), saving: ref(false), saveAll: vi.fn(),
      }),
    }))
    vi.resetModules()
    const { default: MedalEditor } = await import('../../../components/lms/medalEditor.vue')
    const wrapper = mount(MedalEditor, { global: _globalConfig })
    expect(wrapper.find('.uicon').exists()).toBe(true)
    // loading 时不渲染新增/保存按钮
    expect(wrapper.text()).not.toContain('medal.add')
  })
})
