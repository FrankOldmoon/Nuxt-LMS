/**
 * composables/useRegisterForm tests
 * @see modules/base/composables/useRegisterForm.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  resetAllStubs,
  setMockAuthUser,
  setMockFetchHandler,
  clearMockFetchHandler,
  getToastCalls,
} from '../../../../test/setup/nuxt-stubs'

beforeEach(() => {
  resetAllStubs()
  clearMockFetchHandler()
})

describe('composables/useRegisterForm - 初始状态', () => {
  it('所有字段初始为空', async () => {
    const { useRegisterForm } = await import('../../composables/useRegisterForm')
    const { username, name, email, password, confirmPassword, loading, switchToLogin } = useRegisterForm(() => {}, () => {})
    expect(username.value).toBe('')
    expect(name.value).toBe('')
    expect(email.value).toBe('')
    expect(password.value).toBe('')
    expect(confirmPassword.value).toBe('')
    expect(loading.value).toBe(false)
    expect(typeof switchToLogin).toBe('function')
  })
})

describe('composables/useRegisterForm - handleRegister 校验', () => {
  it('用户名为空时不提交', async () => {
    const { useRegisterForm } = await import('../../composables/useRegisterForm')
    const { handleRegister, loading } = useRegisterForm(() => {}, () => {})
    await handleRegister()
    // No fetch triggered, loading unchanged
    expect(loading.value).toBe(false)
  })

  it('姓名为空时不提交', async () => {
    const { useRegisterForm } = await import('../../composables/useRegisterForm')
    const { username, handleRegister, loading } = useRegisterForm(() => {}, () => {})
    username.value = 'alice'
    await handleRegister()
    expect(loading.value).toBe(false)
  })

  it('密码为空时不提交', async () => {
    const { useRegisterForm } = await import('../../composables/useRegisterForm')
    const { username, name, handleRegister, loading } = useRegisterForm(() => {}, () => {})
    username.value = 'alice'
    name.value = 'Alice'
    await handleRegister()
    expect(loading.value).toBe(false)
  })

  it('密码不一致时弹错误 toast 且不提交', async () => {
    const { useRegisterForm } = await import('../../composables/useRegisterForm')
    const { username, name, password, confirmPassword, handleRegister } = useRegisterForm(() => {}, () => {})
    username.value = 'alice'
    name.value = 'Alice'
    password.value = 'pass1'
    confirmPassword.value = 'pass2'
    await handleRegister()
    const calls = getToastCalls()
    expect(calls).toHaveLength(1)
    expect(calls[0].color).toBe('error')
  })
})

describe('composables/useRegisterForm - handleRegister 成功', () => {
  it('注册成功后调用 onSuccess 并弹成功 toast', async () => {
    setMockAuthUser(null)
    setMockFetchHandler(async (url) => {
      if (url === '/api/auth/register') {
        return { data: { user: { id: 1, username: 'alice' }, token: 't' }, success: true, msg: '' }
      }
      return { data: null, success: true, msg: '' }
    })
    const { useRegisterForm } = await import('../../composables/useRegisterForm')
    let successCalled = false
    const { username, name, email, password, confirmPassword, handleRegister, loading } = useRegisterForm(
      () => { successCalled = true },
      () => {},
    )
    username.value = 'alice'
    name.value = 'Alice'
    email.value = 'alice@example.com'
    password.value = 'pass1'
    confirmPassword.value = 'pass1'
    await handleRegister()
    expect(successCalled).toBe(true)
    expect(loading.value).toBe(false)
    const calls = getToastCalls()
    expect(calls).toHaveLength(1)
    expect(calls[0].color).toBe('success')
  })

  it('注册失败时弹错误 toast 且不调用 onSuccess', async () => {
    setMockFetchHandler(async () => ({ data: null, success: false, msg: 'username exists' }))
    const { useRegisterForm } = await import('../../composables/useRegisterForm')
    let successCalled = false
    const { username, name, password, confirmPassword, handleRegister } = useRegisterForm(
      () => { successCalled = true },
      () => {},
    )
    username.value = 'alice'
    name.value = 'Alice'
    password.value = 'pass1'
    confirmPassword.value = 'pass1'
    await handleRegister()
    expect(successCalled).toBe(false)
    const calls = getToastCalls()
    expect(calls).toHaveLength(1)
    expect(calls[0].color).toBe('error')
    expect(calls[0].description).toBe('username exists')
  })

  it('email 为空时传 undefined', async () => {
    let capturedBody: any
    setMockFetchHandler(async (_url, opts: any) => {
      capturedBody = opts.body
      return { data: { user: { id: 1 }, token: 't' }, success: true, msg: '' }
    })
    const { useRegisterForm } = await import('../../composables/useRegisterForm')
    const { username, name, password, confirmPassword, handleRegister } = useRegisterForm(() => {}, () => {})
    username.value = 'alice'
    name.value = 'Alice'
    password.value = 'pass1'
    confirmPassword.value = 'pass1'
    await handleRegister()
    expect(capturedBody.email).toBeUndefined()
  })
})
