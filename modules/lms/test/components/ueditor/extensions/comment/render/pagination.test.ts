/**
 * pagination component test
 * @see modules/lms/components/ueditor/extensions/nodes/vue/comment/render/pagination.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../../../../test/setup/nuxt-stubs'
import { CommentRenderKey } from '../../../../../../components/ueditor/extensions/nodes/vue/comment/useCommentRender'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UButton: { template: '<button :disabled="disabled" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>', props: ['color', 'variant', 'size', 'icon', 'disabled', 'label'] },
}

function makeMockContext(childrenCount: number, pSize: number = 5) {
  const children = ref(Array.from({ length: childrenCount }, (_, i) => ({ cid: i + 1 })))
  const page = ref(1)
  const pageSize = pSize
  const totalPages = ref(Math.max(1, Math.ceil(children.value.length / pageSize)))
  return { children, pageSize, page, totalPages }
}

const _globalConfig = {
  stubs: _globalStubs,
  mocks: { $t: (k: string) => k },
}

describe('comment/render/pagination.vue', () => {
  it('does not render when children count <= pageSize', async () => {
    const { default: Pagination } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/comment/render/pagination.vue'
    )
    const ctx = makeMockContext(3, 5)
    const wrapper = mount(Pagination, {
      global: { ..._globalConfig, provide: { [CommentRenderKey as any]: ctx } },
    })
    expect(wrapper.find('.flex.items-center.justify-between').exists()).toBe(false)
  })

  it('renders pagination controls when children > pageSize', async () => {
    const { default: Pagination } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/comment/render/pagination.vue'
    )
    const ctx = makeMockContext(12, 5)
    const wrapper = mount(Pagination, {
      global: { ..._globalConfig, provide: { [CommentRenderKey as any]: ctx } },
    })
    expect(wrapper.text()).toContain('1-5')
    expect(wrapper.text()).toContain('12')
    expect(wrapper.text()).toContain('1 / 3')
  })

  it('page-- button is disabled on first page', async () => {
    const { default: Pagination } = await import(
      '../../../../../../components/ueditor/extensions/nodes/vue/comment/render/pagination.vue'
    )
    const ctx = makeMockContext(12, 5)
    const wrapper = mount(Pagination, {
      global: { ..._globalConfig, provide: { [CommentRenderKey as any]: ctx } },
    })
    const buttons = wrapper.findAll('button')
    expect(buttons[0].attributes('disabled')).toBeDefined()
  })
})
