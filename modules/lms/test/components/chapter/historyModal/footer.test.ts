/**
 * chapter/historyModal/footer.vue 组件测试
 * @see modules/lms/components/chapter/historyModal/footer.vue
 *
 * 历史版本底部：版本号 + 新版本徽章 + 上一页/下一页 + 恢复按钮。
 * 纯展示组件，通过 props 渲染、emits 上报 prev/next/restore。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { resetAllStubs, setMockI18n } from '../../../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  setMockI18n({
    locale: { value: 'en' },
    t: (k: string, params?: any) => {
      if (params) {
        let s = k
        for (const [kk, v] of Object.entries(params)) s = s.replace(`{${kk}}`, String(v))
        return s
      }
      return k
    },
    d: (v: any) => String(v),
  })
  // formatTime is auto-imported from utils; stub it on globalThis for script usage
  ;(globalThis as any).formatTime = (v: any) => (v ? String(v) : '')
})

const _globalStubs = {
  UIcon: { template: '<span class="uicon" />', props: ['name'] },
  UBadge: { template: '<span class="ubadge">{{ label }}<slot /></span>', props: ['label', 'color', 'variant', 'size'] },
  UButton: {
    template: '<button :disabled="disabled || loading" :loading="loading" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>',
    props: ['icon', 'size', 'color', 'variant', 'label', 'disabled', 'loading'],
  },
}

const _globalConfig = {
  mocks: {
    $t: (k: string, params?: any) => {
      if (params) {
        let s = k
        for (const [kk, v] of Object.entries(params)) s = s.replace(`{${kk}}`, String(v))
        return s
      }
      return k
    },
  },
  stubs: _globalStubs,
  config: {
    globalProperties: {
      formatTime: (v: any) => (v ? String(v) : ''),
    },
  },
}

describe('chapter/historyModal/footer.vue', () => {
  const sampleVersion = { id: 5, content: { type: 'doc' }, createdAt: '2026-01-01T00:00:00Z' }

  it('默认渲染：版本号 + 分页 + 恢复按钮', async () => {
    const { default: Footer } = await import('../../../../components/chapter/historyModal/footer.vue')
    const wrapper = mount(Footer, {
      props: { page: 1, total: 3, currentVersion: sampleVersion, restoring: false },
      global: _globalConfig,
    })
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.text()).toContain('layout.versionLabel')
    expect(wrapper.text()).toContain('1 / 3')
  })

  it('page=1 时显示"最新"徽章', async () => {
    const { default: Footer } = await import('../../../../components/chapter/historyModal/footer.vue')
    const wrapper = mount(Footer, {
      props: { page: 1, total: 3, currentVersion: sampleVersion, restoring: false },
      global: _globalConfig,
    })
    expect(wrapper.text()).toContain('layout.versionNewest')
  })

  it('page>1 时不显示"最新"徽章', async () => {
    const { default: Footer } = await import('../../../../components/chapter/historyModal/footer.vue')
    const wrapper = mount(Footer, {
      props: { page: 2, total: 3, currentVersion: sampleVersion, restoring: false },
      global: _globalConfig,
    })
    expect(wrapper.text()).not.toContain('layout.versionNewest')
  })

  it('page<=1 时上一页按钮 disabled', async () => {
    const { default: Footer } = await import('../../../../components/chapter/historyModal/footer.vue')
    const wrapper = mount(Footer, {
      props: { page: 1, total: 3, currentVersion: sampleVersion, restoring: false },
      global: _globalConfig,
    })
    const btns = wrapper.findAll('button')
    // 第一个 button 是 prev
    expect((btns[0].element as HTMLButtonElement).disabled).toBe(true)
    // 第二个是 next（可点击）
    expect((btns[1].element as HTMLButtonElement).disabled).toBe(false)
  })

  it('page>=total 时下一页按钮 disabled', async () => {
    const { default: Footer } = await import('../../../../components/chapter/historyModal/footer.vue')
    const wrapper = mount(Footer, {
      props: { page: 3, total: 3, currentVersion: sampleVersion, restoring: false },
      global: _globalConfig,
    })
    const btns = wrapper.findAll('button')
    expect((btns[1].element as HTMLButtonElement).disabled).toBe(true)
  })

  it('点击上一页按钮 emit prev', async () => {
    const { default: Footer } = await import('../../../../components/chapter/historyModal/footer.vue')
    const wrapper = mount(Footer, {
      props: { page: 2, total: 3, currentVersion: sampleVersion, restoring: false },
      global: _globalConfig,
    })
    await wrapper.findAll('button')[0].trigger('click')
    expect(wrapper.emitted('prev')).toBeTruthy()
  })

  it('点击下一页按钮 emit next', async () => {
    const { default: Footer } = await import('../../../../components/chapter/historyModal/footer.vue')
    const wrapper = mount(Footer, {
      props: { page: 1, total: 3, currentVersion: sampleVersion, restoring: false },
      global: _globalConfig,
    })
    await wrapper.findAll('button')[1].trigger('click')
    expect(wrapper.emitted('next')).toBeTruthy()
  })

  it('点击恢复按钮 emit restore', async () => {
    const { default: Footer } = await import('../../../../components/chapter/historyModal/footer.vue')
    const wrapper = mount(Footer, {
      props: { page: 1, total: 3, currentVersion: sampleVersion, restoring: false },
      global: _globalConfig,
    })
    // 最后一个 button 是恢复
    const btns = wrapper.findAll('button')
    await btns[btns.length - 1].trigger('click')
    expect(wrapper.emitted('restore')).toBeTruthy()
  })

  it('restoring=true 时恢复按钮 disabled', async () => {
    const { default: Footer } = await import('../../../../components/chapter/historyModal/footer.vue')
    const wrapper = mount(Footer, {
      props: { page: 1, total: 3, currentVersion: sampleVersion, restoring: true },
      global: _globalConfig,
    })
    const btns = wrapper.findAll('button')
    expect((btns[btns.length - 1].element as HTMLButtonElement).disabled).toBe(true)
  })
})
