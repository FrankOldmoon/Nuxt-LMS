/**
 * menu/editorItemActions.vue component tests
 * @see modules/admin/components/menu/editorItemActions.vue
 *
 * Menu item action button group: edit + add child + add sibling + delete
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
})

const _globalStubs = {
  UButton: {
    template: '<button class="ubutton" :data-icon="icon" :title="title" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['icon', 'variant', 'size', 'color', 'title'],
  },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('menu/editorItemActions.vue', () => {
  const sampleItem = { _key: 0, table: 'users', label: 'Users', visible: true, depth: 0 }

  it('渲染 4 个操作按钮', async () => {
    const { default: EditorItemActions } = await import('../../../components/menu/editorItemActions.vue')
    const wrapper = mount(EditorItemActions, {
      props: { item: sampleItem, index: 0, maxDepth: 2 },
      global: _globalConfig,
    })
    const buttons = wrapper.findAll('.ubutton')
    // edit, addChild, addSibling, delete = 4 buttons
    expect(buttons.length).toBe(4)
  })

  it('depth < maxDepth 时渲染添加子项按钮', async () => {
    const { default: EditorItemActions } = await import('../../../components/menu/editorItemActions.vue')
    const wrapper = mount(EditorItemActions, {
      props: { item: sampleItem, index: 0, maxDepth: 2 },
      global: _globalConfig,
    })
    // The add child button has title="admin.menu.addChild"
    const addChildBtn = wrapper.findAll('.ubutton').find(b => b.attributes('title') === 'admin.menu.addChild')
    expect(addChildBtn).toBeTruthy()
  })

  it('depth >= maxDepth 时不渲染添加子项按钮', async () => {
    const { default: EditorItemActions } = await import('../../../components/menu/editorItemActions.vue')
    const wrapper = mount(EditorItemActions, {
      props: { item: { ...sampleItem, depth: 2 }, index: 0, maxDepth: 2 },
      global: _globalConfig,
    })
    const buttons = wrapper.findAll('.ubutton')
    // depth=2 >= maxDepth=2 → only 3 buttons (edit, addSibling, delete)
    expect(buttons.length).toBe(3)
    const addChildBtn = buttons.find(b => b.attributes('title') === 'admin.menu.addChild')
    expect(addChildBtn).toBeUndefined()
  })

  it('点击编辑按钮 emit openEdit', async () => {
    const { default: EditorItemActions } = await import('../../../components/menu/editorItemActions.vue')
    const wrapper = mount(EditorItemActions, {
      props: { item: sampleItem, index: 0, maxDepth: 2 },
      global: _globalConfig,
    })
    const editBtn = wrapper.findAll('.ubutton').find(b => b.attributes('title') === 'admin.menu.editItem')
    await editBtn!.trigger('click')
    expect(wrapper.emitted('openEdit')).toBeTruthy()
    expect(wrapper.emitted('openEdit')![0]).toEqual([0])
  })

  it('点击删除按钮 emit delete', async () => {
    const { default: EditorItemActions } = await import('../../../components/menu/editorItemActions.vue')
    const wrapper = mount(EditorItemActions, {
      props: { item: sampleItem, index: 0, maxDepth: 2 },
      global: _globalConfig,
    })
    const deleteBtn = wrapper.findAll('.ubutton').find(b => b.attributes('title') === 'admin.menu.delete')
    await deleteBtn!.trigger('click')
    expect(wrapper.emitted('delete')).toBeTruthy()
    expect(wrapper.emitted('delete')![0]).toEqual([0])
  })
})
