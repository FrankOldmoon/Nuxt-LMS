/**
 * 3d/edit.vue 配置面板测试
 *
 * 覆盖：每个模型的 scale / position / rotation 编辑项渲染，以及「保存」时
 * 是否把它们写回 emit 的 config（此前面板只能改名，无法调整变换）。
 *
 * @see modules/lms/components/ueditor/extensions/nodes/vue/3d/edit.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UFormField: { template: '<div class="form-field"><slot /></div>', props: ['label', 'size'] },
  UInput: { template: '<input class="uinput" />', props: ['modelValue', 'type', 'placeholder', 'size'] },
  UButton: { template: '<button class="ubtn" @click="$emit(\'click\')"><slot /></button>', props: ['size', 'color', 'label'], emits: ['click'] },
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
  FormInputFile: { template: '<div class="form-input-file" />', props: ['modelValue', 'multiple', 'accept', 'placeholder'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

function makeConfig(overrides: any = {}) {
  return {
    name: 'n',
    models: [{ url: '/api/files/serve?pathname=a%2Fb.stl', name: 'box.stl' }],
    height: 500,
    bg: '#000000',
    autoRotate: false,
    ...overrides,
  }
}

describe('3d/edit.vue', () => {
  it('为每个模型渲染 scale / position / rotation 编辑项', async () => {
    const { default: Edit } = await import('../../../../../components/ueditor/extensions/nodes/vue/3d/edit.vue')
    const wrapper = mount(Edit, { props: { config: makeConfig() }, global: _globalConfig })
    await flushPromises()

    expect(wrapper.text()).toContain('ueditor.modelScale')
    expect(wrapper.text()).toContain('ueditor.modelPosition')
    expect(wrapper.text()).toContain('ueditor.modelRotation')
    // 单个模型：scale 1 + position 3 + rotation 3 = 7 个数值输入
    expect(wrapper.findAll('input[type="number"]').length).toBe(7)
  })

  it('多个模型时编辑项按模型数倍增', async () => {
    const { default: Edit } = await import('../../../../../components/ueditor/extensions/nodes/vue/3d/edit.vue')
    const config = makeConfig({
      models: [
        { url: '/u1', name: 'box.stl' },
        { url: '/u2', name: 'gear.stl', scale: 2, position: [1, 2, 3], rotation: [90, 0, 0] },
      ],
    })
    const wrapper = mount(Edit, { props: { config }, global: _globalConfig })
    await flushPromises()
    expect(wrapper.findAll('input[type="number"]').length).toBe(14)
  })

  it('编辑变换后点保存，emit 的 config 携带 scale / position / rotation', async () => {
    const { default: Edit } = await import('../../../../../components/ueditor/extensions/nodes/vue/3d/edit.vue')
    const wrapper = mount(Edit, { props: { config: makeConfig() }, global: _globalConfig })
    await flushPromises()

    // 顺序：0=scale, 1..3=position X/Y/Z, 4..6=rotation X/Y/Z（度）
    const inputs = wrapper.findAll('input[type="number"]')
    await inputs[0].setValue('2.5')
    await inputs[1].setValue('1')
    await inputs[4].setValue('90')
    await wrapper.find('button.ubtn').trigger('click')

    const emitted = wrapper.emitted('update:config')
    expect(emitted).toBeTruthy()
    const cfg = (emitted!.at(-1) as any[])[0]
    expect(cfg.models[0].scale).toBe(2.5)
    expect(cfg.models[0].position).toEqual([1, 0, 0])
    expect(cfg.models[0].rotation).toEqual([90, 0, 0])
  })

  it('旧配置缺少变换字段时补默认值（scale 1 / position [0,0,0] / rotation [0,0,0]）', async () => {
    const { default: Edit } = await import('../../../../../components/ueditor/extensions/nodes/vue/3d/edit.vue')
    const wrapper = mount(Edit, { props: { config: makeConfig() }, global: _globalConfig })
    await flushPromises()

    const inputs = wrapper.findAll('input[type="number"]')
    expect((inputs[0].element as HTMLInputElement).value).toBe('1')
    expect((inputs[1].element as HTMLInputElement).value).toBe('0')

    await wrapper.find('button.ubtn').trigger('click')
    const cfg = (wrapper.emitted('update:config')!.at(-1) as any[])[0]
    expect(cfg.models[0]).toMatchObject({
      scale: 1,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
    })
  })
})
