/**
 * formField/imageCropperField 组件测试
 * @see modules/admin/components/table/formField/imageCropperField.vue
 *
 * UInput + UAvatar 预览 + TableImageCropperTrigger 触发器 + UModal 预览弹窗
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({
    locale: { value: 'en' },
    t: (k: string) => k,
    d: (v: any) => String(v),
  })
})

// 桩 TableImageCropperTrigger 子组件（Nuxt 自动导入的组件名）
const _globalStubs = {
  UInput: {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'type', 'placeholder', 'icon', 'size'],
  },
  UAvatar: {
    template: '<span class="avatar" :data-src="src" @click="$emit(\'click\')" />',
    props: ['src', 'size'],
  },
  UModal: {
    template: '<div class="modal"><slot /><slot name="content" /></div>',
    props: ['open'],
  },
  TableImageCropperTrigger: {
    template: '<button class="cropper-trigger" @click="$emit(\'uploaded\', \'https://cropped.example.com/x.png\')"><slot /></button>',
    emits: ['uploaded'],
  },
}

const _globalConfig = {
  mocks: {
    $t: (k: string) => k,
    $i18n: { t: (k: string) => k, locale: { value: 'en' } },
  },
  stubs: _globalStubs,
}

function makeCol(over: Partial<any> = {}) {
  return {
    name: 'avatar',
    jsName: 'avatar',
    dataType: 'string',
    columnType: 'PgVarchar',
    notNull: false,
    hasDefault: false,
    isPrimaryKey: false,
    isAutoIncrement: false,
    isTimestamp: false,
    isDeletedAt: false,
    ...over,
  }
}

describe('formField/imageCropperField.vue', () => {
  it('渲染 UInput、TableImageCropperTrigger', async () => {
    const { default: ImageCropperField } = await import('../../../components/table/formField/imageCropperField.vue')
    const wrapper = mount(ImageCropperField, {
      props: { col: makeCol(), form: { avatar: '' } },
      global: _globalConfig,
    })
    expect(wrapper.find('input').exists()).toBe(true)
    expect(wrapper.find('.cropper-trigger').exists()).toBe(true)
  })

  it('form[col.jsName] 有值时渲染 UAvatar 预览', async () => {
    const { default: ImageCropperField } = await import('../../../components/table/formField/imageCropperField.vue')
    const wrapper = mount(ImageCropperField, {
      props: { col: makeCol(), form: { avatar: 'https://example.com/a.png' } },
      global: _globalConfig,
    })
    const avatar = wrapper.find('.avatar')
    expect(avatar.exists()).toBe(true)
    expect(avatar.attributes('data-src')).toBe('https://example.com/a.png')
  })

  it('form[col.jsName] 为空时不渲染 UAvatar', async () => {
    const { default: ImageCropperField } = await import('../../../components/table/formField/imageCropperField.vue')
    const wrapper = mount(ImageCropperField, {
      props: { col: makeCol(), form: { avatar: '' } },
      global: _globalConfig,
    })
    expect(wrapper.find('.avatar').exists()).toBe(false)
  })

  it('输入 URL 时 v-model 写回 form', async () => {
    const { default: ImageCropperField } = await import('../../../components/table/formField/imageCropperField.vue')
    const form = { avatar: '' }
    const wrapper = mount(ImageCropperField, {
      props: { col: makeCol(), form },
      global: _globalConfig,
    })
    const input = wrapper.find('input')
    await input.setValue('https://example.com/new.png')
    expect(form.avatar).toBe('https://example.com/new.png')
  })

  it('TableImageCropperTrigger uploaded 事件将 URL 写回 form[col.jsName]', async () => {
    const { default: ImageCropperField } = await import('../../../components/table/formField/imageCropperField.vue')
    const form = { avatar: '' }
    const wrapper = mount(ImageCropperField, {
      props: { col: makeCol(), form },
      global: _globalConfig,
    })
    const trigger = wrapper.find('.cropper-trigger')
    await trigger.trigger('click')
    expect(form.avatar).toBe('https://cropped.example.com/x.png')
  })

  it('渲染 UModal 用于大图预览', async () => {
    const { default: ImageCropperField } = await import('../../../components/table/formField/imageCropperField.vue')
    const wrapper = mount(ImageCropperField, {
      props: { col: makeCol(), form: { avatar: 'https://example.com/a.png' } },
      global: _globalConfig,
    })
    expect(wrapper.find('.modal').exists()).toBe(true)
  })
})
