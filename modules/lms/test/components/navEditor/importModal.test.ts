/**
 * navEditor/importModal.vue 组件测试
 * @see modules/lms/components/navEditor/importModal.vue
 *
 * 批量导入弹窗：AI 生成 + 文本输入
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UModal: {
    template: '<div v-if="open" class="modal"><slot name="content" /></div>',
    props: ['open', 'ui'],
  },
  UButton: {
    template: '<button class="ubutton" :data-loading="loading" :disabled="disabled" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>',
    props: ['icon', 'color', 'variant', 'size', 'loading', 'disabled', 'label'],
  },
  UInput: {
    template: '<input class="uinput" :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" @keydown="$emit(\'keydown\', $event)" />',
    props: ['modelValue', 'placeholder', 'size', 'disabled'],
  },
  UTextarea: {
    template: '<textarea class="utextarea" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder', 'rows', 'class'],
  },
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('navEditor/importModal.vue', () => {
  it('open=true 时渲染弹窗', async () => {
    const { default: ImportModal } = await import('../../../components/navEditor/importModal.vue')
    const wrapper = mount(ImportModal, {
      props: { open: true, text: '', prompt: '', generating: false },
      global: _globalConfig,
    })
    expect(wrapper.find('.modal').exists()).toBe(true)
  })

  it('open=false 时不渲染弹窗', async () => {
    const { default: ImportModal } = await import('../../../components/navEditor/importModal.vue')
    const wrapper = mount(ImportModal, {
      props: { open: false, text: '', prompt: '', generating: false },
      global: _globalConfig,
    })
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('渲染标题', async () => {
    const { default: ImportModal } = await import('../../../components/navEditor/importModal.vue')
    const wrapper = mount(ImportModal, {
      props: { open: true, text: '', prompt: '', generating: false },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('navEditor.batchImport')
  })

  it('渲染文本输入区', async () => {
    const { default: ImportModal } = await import('../../../components/navEditor/importModal.vue')
    const wrapper = mount(ImportModal, {
      props: { open: true, text: 'sample text', prompt: '', generating: false },
      global: _globalConfig,
    })
    expect(wrapper.find('.utextarea').exists()).toBe(true)
  })

  it('generating=true 时显示生成中提示', async () => {
    const { default: ImportModal } = await import('../../../components/navEditor/importModal.vue')
    const wrapper = mount(ImportModal, {
      props: { open: true, text: '', prompt: 'test', generating: true },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('navEditor.aiGenerating')
  })

  it('点击确认按钮 emit confirm 事件', async () => {
    const { default: ImportModal } = await import('../../../components/navEditor/importModal.vue')
    const wrapper = mount(ImportModal, {
      props: { open: true, text: 'x', prompt: '', generating: false },
      global: _globalConfig,
    })
    const buttons = wrapper.findAll('.ubutton')
    // 最后一个按钮是确认
    const confirmBtn = buttons[buttons.length - 1]!
    await confirmBtn.trigger('click')
    expect(wrapper.emitted('confirm')).toBeTruthy()
  })

  it('点击取消按钮 emit update:open false', async () => {
    const { default: ImportModal } = await import('../../../components/navEditor/importModal.vue')
    const wrapper = mount(ImportModal, {
      props: { open: true, text: '', prompt: '', generating: false },
      global: _globalConfig,
    })
    const buttons = wrapper.findAll('.ubutton')
    // 按钮顺序：AI Generate(0), Cancel(1), Confirm(2) — 按文本查找更稳健
    const cancelBtn = buttons.find(b => b.text().includes('common.cancel'))
    expect(cancelBtn).toBeTruthy()
    await cancelBtn!.trigger('click')
    const updateEvents = wrapper.emitted('update:open')
    expect(updateEvents).toBeTruthy()
    expect(updateEvents![0]).toEqual([false])
  })

  it('prompt 为空时 AI 生成按钮禁用', async () => {
    const { default: ImportModal } = await import('../../../components/navEditor/importModal.vue')
    const wrapper = mount(ImportModal, {
      props: { open: true, text: '', prompt: '', generating: false },
      global: _globalConfig,
    })
    const buttons = wrapper.findAll('.ubutton')
    // AI 生成按钮是第一个按钮（带 sparkles icon）
    const aiBtn = buttons.find(b => b.text().includes('navEditor.aiGenerate'))
    expect(aiBtn).toBeTruthy()
    expect(aiBtn!.attributes('disabled')).toBeDefined()
  })
})
