/**
 * auth/userProfileForm.vue component tests
 * @see modules/base/components/auth/userProfileForm.vue
 *
 * userProfileForm manages editability, avatar upload, etc. via useUserProfileForm.
 * Uses v-model="form" to receive formData.
 */
import {
  describe, it, expect, beforeEach,
  mount, flushPromises,
  _globalStubs, _globalConfig, baseBeforeEach,
  setMockAuthUser,
} from './_shared'

beforeEach(() => {
  baseBeforeEach()
  // Test as admin by default, can edit all fields
  setMockAuthUser(
    { id: 1, username: 'admin', name: 'Admin' },
    [{ code: 'admin', name: 'Admin' }],
  )
})

const _stubs = {
  ..._globalStubs,
  FormImageCropperModal: {
    template: '<div class="stub-cropper" />',
    props: ['title', 'aspectRatio', 'stencilType'],
    emits: ['uploaded'],
  },
  AuthUserProfilePasswordModal: {
    template: '<div class="stub-pwd-modal" />',
    props: ['open'],
    emits: ['update:open'],
  },
}

function makeForm(overrides: any = {}) {
  return {
    name: '', preferName: '', englishName: '', email: '',
    gender: '', avatarImg: '', rollNumber: '', telephone: '',
    classId: null,
    ...overrides,
  }
}

describe('auth/userProfileForm.vue', () => {
  it('使用必填 formModel 渲染', async () => {
    const { default: UserProfileForm } = await import('../../../components/auth/userProfileForm.vue')
    const wrapper = mount(UserProfileForm, {
      props: { modelValue: makeForm({ name: 'Alice' }) },
      global: { ..._globalConfig, stubs: _stubs },
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('渲染头像区域', async () => {
    const { default: UserProfileForm } = await import('../../../components/auth/userProfileForm.vue')
    const wrapper = mount(UserProfileForm, {
      props: { modelValue: makeForm({ name: 'Alice' }) },
      global: { ..._globalConfig, stubs: _stubs },
    })
    expect(wrapper.find('.uavatar').exists()).toBe(true)
  })

  it('渲染所有表单字段（name, email, gender, rollNumber, telephone 等）', async () => {
    const { default: UserProfileForm } = await import('../../../components/auth/userProfileForm.vue')
    const wrapper = mount(UserProfileForm, {
      props: { modelValue: makeForm() },
      global: { ..._globalConfig, stubs: _stubs },
    })
    const labels = wrapper.findAll('label')
    const labelTexts = labels.map(l => l.text())
    expect(labelTexts.some(t => t.includes('profile.name'))).toBe(true)
    expect(labelTexts.some(t => t.includes('profile.email'))).toBe(true)
    expect(labelTexts.some(t => t.includes('profile.gender'))).toBe(true)
    expect(labelTexts.some(t => t.includes('profile.rollNumber'))).toBe(true)
    expect(labelTexts.some(t => t.includes('profile.telephone'))).toBe(true)
  })

  it('渲染修改密码按钮', async () => {
    const { default: UserProfileForm } = await import('../../../components/auth/userProfileForm.vue')
    const wrapper = mount(UserProfileForm, {
      props: { modelValue: makeForm() },
      global: { ..._globalConfig, stubs: _stubs },
    })
    const buttons = wrapper.findAll('button.ubtn')
    expect(buttons.some(b => b.text().includes('profile.changePassword'))).toBe(true)
  })

  it('admin 可编辑通用字段（输入框不 disabled）', async () => {
    const { default: UserProfileForm } = await import('../../../components/auth/userProfileForm.vue')
    const wrapper = mount(UserProfileForm, {
      props: { modelValue: makeForm() },
      global: { ..._globalConfig, stubs: _stubs },
    })
    const inputs = wrapper.findAll('input.uinput')
    // name field should not be disabled (admin can edit)
    const nameInput = inputs.find(i => !i.attributes('disabled'))
    expect(nameInput).toBeTruthy()
  })

  it('student 不可编辑通用字段（输入框 disabled）', async () => {
    setMockAuthUser(
      { id: 3, username: 'student', name: 'Student' },
      [{ code: 'student', name: 'Student' }],
    )
    const { default: UserProfileForm } = await import('../../../components/auth/userProfileForm.vue')
    const wrapper = mount(UserProfileForm, {
      props: { modelValue: makeForm() },
      global: { ..._globalConfig, stubs: _stubs },
    })
    // student cannot edit general fields → UInput disabled
    const disabledInputs = wrapper.findAll('input[disabled]')
    expect(disabledInputs.length).toBeGreaterThan(0)
  })
})
