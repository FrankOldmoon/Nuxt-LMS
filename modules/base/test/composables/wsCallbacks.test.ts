/**
 * composables/ws/callbacks tests
 * @see modules/base/composables/ws/callbacks.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { resetAllStubs } from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
})

describe('composables/ws/callbacks', () => {
  it('registerWsHandler 注册后 dispatch 会触发回调', async () => {
    const { registerWsHandler, dispatch, clearWsHandlers } = await import('../../composables/ws/callbacks')
    clearWsHandlers()
    const received: any[] = []
    registerWsHandler('message', (data) => { received.push(data) })
    dispatch('message', { id: 1 })
    expect(received).toEqual([{ id: 1 }])
  })

  it('同一 type 注册多个 handler 全部触发', async () => {
    const { registerWsHandler, dispatch, clearWsHandlers } = await import('../../composables/ws/callbacks')
    clearWsHandlers()
    const a: any[] = []
    const b: any[] = []
    registerWsHandler('notify', (d) => { a.push(d) })
    registerWsHandler('notify', (d) => { b.push(d) })
    dispatch('notify', { x: 1 })
    expect(a).toEqual([{ x: 1 }])
    expect(b).toEqual([{ x: 1 }])
  })

  it('不同 type 互不干扰', async () => {
    const { registerWsHandler, dispatch, clearWsHandlers } = await import('../../composables/ws/callbacks')
    clearWsHandlers()
    const msg: any[] = []
    const notify: any[] = []
    registerWsHandler('message', (d) => { msg.push(d) })
    registerWsHandler('notify', (d) => { notify.push(d) })
    dispatch('message', { id: 1 })
    expect(msg).toHaveLength(1)
    expect(notify).toHaveLength(0)
  })

  it('返回的取消注册函数能移除回调', async () => {
    const { registerWsHandler, dispatch, clearWsHandlers } = await import('../../composables/ws/callbacks')
    clearWsHandlers()
    const received: any[] = []
    const unregister = registerWsHandler('message', (d) => { received.push(d) })
    dispatch('message', { id: 1 })
    unregister()
    dispatch('message', { id: 2 })
    expect(received).toEqual([{ id: 1 }])
  })

  it('未注册的 type dispatch 不抛错', async () => {
    const { dispatch, clearWsHandlers } = await import('../../composables/ws/callbacks')
    clearWsHandlers()
    expect(() => dispatch('unknown', { x: 1 })).not.toThrow()
  })

  it('clearWsHandlers 清空所有回调', async () => {
    const { registerWsHandler, dispatch, clearWsHandlers } = await import('../../composables/ws/callbacks')
    clearWsHandlers()
    const received: any[] = []
    registerWsHandler('message', (d) => { received.push(d) })
    clearWsHandlers()
    dispatch('message', { id: 1 })
    expect(received).toEqual([])
  })

  it('取消注册函数可重复调用不出错', async () => {
    const { registerWsHandler, dispatch, clearWsHandlers } = await import('../../composables/ws/callbacks')
    clearWsHandlers()
    const received: any[] = []
    const unregister = registerWsHandler('message', (d) => { received.push(d) })
    unregister()
    unregister()
    dispatch('message', { id: 1 })
    expect(received).toEqual([])
  })
})
