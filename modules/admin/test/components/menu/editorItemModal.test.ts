/**
 * menu/editorItemModal.vue component tests
 * @see modules/admin/components/menu/editorItemModal.vue
 *
 * Single menu item edit modal: label/icon/to/table/visible editing
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { resetAllStubs, setMockI18n } from '../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({ locale: { value: 'en' }, t: (k: string) => k, d: (v: any) => String(v) })
  // stub useEditorItemDrafts
  ;(globalThis as any).useEditorItemDrafts = (_open: any, _item: any) => {
    const labelDraft = ref('')
    const iconDraft = ref('')
    const toDraft = ref('')
    const tableDraft = ref<string | undefined>(undefined)
    const visibleDraft = ref(true)
    // Simulate open watcher: initialize from item when open=true
    const openVal = _open()
    const itemVal = _item()
    if (openVal && itemVal) {
      labelDraft.value = itemVal.label || ''
      iconDraft.value = itemVal.icon || ''
      toDraft.value = itemVal.to || ''
      tableDraft.value = itemVal.table
      visibleDraft.value = itemVal.visible
    }
    function buildPatch() {
      return {
        label: labelDraft.value.trim() || (tableDraft.value || 'Group'),
        icon: iconDraft.value.trim() || undefined,
        to: toDraft.value.trim() || undefined,
        table: tableDraft.value,
        visible: visibleDraft.value,
      }
    }
    return { labelDraft, iconDraft, toDraft, tableDraft, visibleDraft, buildPatch }
  }
})

const _globalStubs = {
  UModal: {
    template: '<div v-if="open" class="modal"><slot name="content" /></div>',
    props: ['open', 'ui'],
  },
  UButton: {
    template: '<button class="ubutton" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>',
    props: ['icon', 'color', 'variant', 'size', 'label'],
  },
  UInput: {
    template: '<input class="uinput" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'size', 'placeholder'],
  },
  UFormField: {
    template: '<div class="uform-field"><label v-if="label">{{ label }}</label><slot /></div>',
    props: ['label', 'description', 'required'],
  },
  USelectMenu: {
    template: '<select class="uselect-menu" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="item in items" :key="item.value" :value="item.value">{{ item.label }}</option></select>',
    props: ['modelValue', 'items', 'valueKey', 'optionAttribute', 'placeholder', 'size'],
  },
  USwitch: {
    template: '<div class="uswitch" :data-checked="modelValue" @click="$emit(\'update:modelValue\', !modelValue)" />',
    props: ['modelValue'],
  },
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
}

const _globalConfig = {
  mocks: { $t: (k: string) => k },
  stubs: _globalStubs,
}

describe('menu/editorItemModal.vue', () => {
  const sampleItem = { _key: 0, table: 'users', label: 'Users', visible: true, icon: 'i-lucide-users', to: '/dashboard/t/users', depth: 0 }
  const sampleTables = [
    { name: 'users', labelColumn: 'name', hasId: true, compositePk: false, readOnly: false, columns: [] },
    { name: 'courses', labelColumn: 'title', hasId: true, compositePk: false, readOnly: false, columns: [] },
  ]

  it('open=false 时不渲染弹窗', async () => {
    const { default: EditorItemModal } = await import('../../../components/menu/editorItemModal.vue')
    const wrapper = mount(EditorItemModal, {
      props: { open: false, item: sampleItem, tables: sampleTables },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('open=true 时渲染弹窗', async () => {
    const { default: EditorItemModal } = await import('../../../components/menu/editorItemModal.vue')
    const wrapper = mount(EditorItemModal, {
      props: { open: true, item: sampleItem, tables: sampleTables },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.find('.modal').exists()).toBe(true)
  })

  it('渲染标题', async () => {
    const { default: EditorItemModal } = await import('../../../components/menu/editorItemModal.vue')
    const wrapper = mount(EditorItemModal, {
      props: { open: true, item: sampleItem, tables: sampleTables },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('admin.menu.editItem')
  })

  it('渲染表单字段（label/icon/to/table/visible）', async () => {
    const { default: EditorItemModal } = await import('../../../components/menu/editorItemModal.vue')
    const wrapper = mount(EditorItemModal, {
      props: { open: true, item: sampleItem, tables: sampleTables },
      global: _globalConfig,
    })
    await flushPromises()
    expect(wrapper.text()).toContain('admin.menu.label')
    expect(wrapper.text()).toContain('admin.menu.icon')
    expect(wrapper.text()).toContain('admin.menu.to')
    expect(wrapper.text()).toContain('admin.menu.selectTable')
    expect(wrapper.text()).toContain('admin.menu.visible')
  })

  it('item=null 时不渲染表单内容', async () => {
    const { default: EditorItemModal } = await import('../../../components/menu/editorItemModal.vue')
    const wrapper = mount(EditorItemModal, {
      props: { open: true, item: null, tables: sampleTables },
      global: _globalConfig,
    })
    await flushPromises()
    // When item=null, v-if="item" is false, content div not rendered
    expect(wrapper.find('.uform-field').exists()).toBe(false)
  })

  it('渲染保存和取消按钮', async () => {
    const { default: EditorItemModal } = await import('../../../components/menu/editorItemModal.vue')
    const wrapper = mount(EditorItemModal, {
      props: { open: true, item: sampleItem, tables: sampleTables },
      global: _globalConfig,
    })
    await flushPromises()
    const buttons = wrapper.findAll('.ubutton')
    const saveBtn = buttons.find(b => b.text().includes('admin.menu.saveAndClose'))
    const cancelBtn = buttons.find(b => b.text().includes('admin.menu.cancel'))
    expect(saveBtn).toBeTruthy()
    expect(cancelBtn).toBeTruthy()
  })
})
