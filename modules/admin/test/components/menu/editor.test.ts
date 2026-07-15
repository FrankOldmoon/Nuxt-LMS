/**
 * menu/Editor.vue component tests
 * @see modules/admin/components/menu/Editor.vue
 *
 * Menu editor modal: menu tree + single item edit + save/reset/cancel
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  // stub useMenuEditor
  ;(globalThis as any).useMenuEditor = (_open: any, _emit: any) => ({
    tables: ref([{ name: 'users', labelColumn: 'name', hasId: true, compositePk: false, readOnly: false, columns: [] }]),
    local: ref([
      { _key: 0, table: 'users', label: 'Users', visible: true, depth: 0 },
    ]),
    genKey: () => 0,
    pending: ref(false),
    resetFromItems: vi.fn(),
    onSave: vi.fn(async () => {}),
    itemEditOpen: ref(false),
    editingItem: ref(null),
    openItemEdit: vi.fn(),
    onItemConfirm: vi.fn(),
  })
})

const _globalStubs = {
  UModal: {
    template: '<div><slot /><div v-if="open" class="modal"><slot name="content" /></div></div>',
    props: ['open', 'ui'],
  },
  UButton: {
    template: '<button class="ubutton" :data-loading="loading" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>',
    props: ['icon', 'color', 'variant', 'size', 'loading', 'label'],
  },
  MenuEditorList: { template: '<div class="menu-editor-list" />', props: ['modelValue', 'maxDepth', 'genKey'] },
  MenuEditorItemModal: { template: '<div class="menu-editor-item-modal" />', props: ['open', 'item', 'tables'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('menu/Editor.vue', () => {
  it('open=false 时不渲染弹窗内容', async () => {
    const { default: Editor } = await import('../../../components/menu/Editor.vue')
    const wrapper = mount(Editor, {
      props: { open: false },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('open=true 时渲染弹窗内容', async () => {
    const { default: Editor } = await import('../../../components/menu/Editor.vue')
    const wrapper = mount(Editor, {
      props: { open: true },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(true)
  })

  it('渲染标题', async () => {
    const { default: Editor } = await import('../../../components/menu/Editor.vue')
    const wrapper = mount(Editor, {
      props: { open: true },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('admin.menu.edit')
  })

  it('渲染保存按钮', async () => {
    const { default: Editor } = await import('../../../components/menu/Editor.vue')
    const wrapper = mount(Editor, {
      props: { open: true },
      global: _globalConfig,
    })
    await flushPromises()
    const saveBtn = wrapper.findAll('.ubutton').find(b => b.text().includes('admin.menu.saveAndClose'))
    expect(saveBtn).toBeTruthy()
  })

  it('渲染取消按钮', async () => {
    const { default: Editor } = await import('../../../components/menu/Editor.vue')
    const wrapper = mount(Editor, {
      props: { open: true },
      global: _globalConfig,
    })
    await flushPromises()
    const cancelBtn = wrapper.findAll('.ubutton').find(b => b.text().includes('admin.menu.cancel'))
    expect(cancelBtn).toBeTruthy()
  })

  it('渲染重置按钮', async () => {
    const { default: Editor } = await import('../../../components/menu/Editor.vue')
    const wrapper = mount(Editor, {
      props: { open: true },
      global: _globalConfig,
    })
    await flushPromises()
    const resetBtn = wrapper.findAll('.ubutton').find(b => b.text().includes('admin.menu.reset'))
    expect(resetBtn).toBeTruthy()
  })
})
