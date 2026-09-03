/**
 * composables/useUserProfileForm 测试
 * @see modules/base/composables/useUserProfileForm.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, computed } from 'vue'
import { resetAllStubs, setMockAuthUser } from '../../../../test/setup/nuxt-stubs'

// useClasses / useUserProfileConfig 是 auto-import，未在 nuxt-stubs 中暴露，需手动 stub
function stubDeps(opts: {
  classes?: any[]
  allowSelfAvatarUpload?: boolean
  allowChangePassword?: boolean
  allowChangeEmail?: boolean
} = {}) {
  const classes = ref(opts.classes ?? [])
  ;(globalThis as any).useClasses = () => ({
    classes,
    classOptions: computed(() => [
      { label: '', value: null },
      ...classes.value.map((c: any) => ({ label: c.name, value: c.id })),
    ]),
    loadClasses: async () => { classes.value = opts.classes ?? [] },
  })
  ;(globalThis as any).useUserProfileConfig = () => ({
    allowSelfAvatarUpload: computed(() => opts.allowSelfAvatarUpload ?? true),
    allowChangePassword: computed(() => opts.allowChangePassword ?? true),
    allowChangeEmail: computed(() => opts.allowChangeEmail ?? true),
    allowChangeLocale: computed(() => true),
    allowExportData: computed(() => true),
    refresh: async () => {},
  })
}

beforeEach(() => {
  resetAllStubs()
  stubDeps()
})

function makeForm(overrides: any = {}) {
  return ref({
    name: '', preferName: '', englishName: '', email: '',
    gender: '', avatarImg: '', telephone: '',
    classId: null,
    ...overrides,
  })
}

describe('composables/useUserProfileForm - canEdit* (基于角色)', () => {
  it('admin 可编辑所有字段', async () => {
    setMockAuthUser({ id: 1, username: 'admin', name: 'Admin' }, [{ code: 'admin', name: 'Admin' }])
    const { useUserProfileForm } = await import('../../composables/useUserProfileForm')
    const { canEditGeneral, canEditAvatar, canEditClass, canEditEmail, canEditPassword } = useUserProfileForm(makeForm())
    expect(canEditGeneral.value).toBe(true)
    expect(canEditAvatar.value).toBe(true)
    expect(canEditClass.value).toBe(true)
    expect(canEditEmail.value).toBe(true)
    expect(canEditPassword.value).toBe(true)
  })

  it('teacher 可编辑通用字段但不可编辑班级', async () => {
    setMockAuthUser({ id: 2, username: 't', name: 'T' }, [{ code: 'teacher', name: 'Teacher' }])
    const { useUserProfileForm } = await import('../../composables/useUserProfileForm')
    const { canEditGeneral, canEditClass } = useUserProfileForm(makeForm())
    expect(canEditGeneral.value).toBe(true)
    expect(canEditClass.value).toBe(false)
  })

  it('student 不可编辑任何字段', async () => {
    setMockAuthUser({ id: 3, username: 's', name: 'S' }, [{ code: 'student', name: 'Student' }])
    const { useUserProfileForm } = await import('../../composables/useUserProfileForm')
    const { canEditGeneral, canEditAvatar, canEditClass, canEditEmail, canEditPassword } = useUserProfileForm(makeForm())
    expect(canEditGeneral.value).toBe(false)
    expect(canEditAvatar.value).toBe(false)
    expect(canEditClass.value).toBe(false)
    expect(canEditEmail.value).toBe(false)
    // 学生也能修改自己的密码
    expect(canEditPassword.value).toBe(true)
  })

  it('allowSelfAvatarUpload=false 时 admin 也不可编辑头像', async () => {
    stubDeps({ allowSelfAvatarUpload: false })
    setMockAuthUser({ id: 1, username: 'admin', name: 'Admin' }, [{ code: 'admin', name: 'Admin' }])
    const { useUserProfileForm } = await import('../../composables/useUserProfileForm')
    const { canEditAvatar } = useUserProfileForm(makeForm())
    expect(canEditAvatar.value).toBe(false)
  })

  it('allowChangeEmail=false 时不可编辑邮箱', async () => {
    stubDeps({ allowChangeEmail: false })
    setMockAuthUser({ id: 1, username: 'admin', name: 'Admin' }, [{ code: 'admin', name: 'Admin' }])
    const { useUserProfileForm } = await import('../../composables/useUserProfileForm')
    const { canEditEmail } = useUserProfileForm(makeForm())
    expect(canEditEmail.value).toBe(false)
  })
})

describe('composables/useUserProfileForm - genderOptions', () => {
  it('返回 3 个性别选项', async () => {
    setMockAuthUser(null)
    const { useUserProfileForm } = await import('../../composables/useUserProfileForm')
    const { genderOptions } = useUserProfileForm(makeForm())
    expect(genderOptions.value).toHaveLength(3)
    expect(genderOptions.value.map((o: any) => o.value)).toEqual(['male', 'female', 'other'])
  })
})

describe('composables/useUserProfileForm - classOptions', () => {
  it('classes 加载后 classOptions 包含班级', async () => {
    stubDeps({ classes: [{ id: 1, name: 'Class A' }, { id: 2, name: 'Class B' }] })
    setMockAuthUser(null)
    const { useUserProfileForm } = await import('../../composables/useUserProfileForm')
    const { classOptions } = useUserProfileForm(makeForm({ classId: null }))
    // 第 1 个是空选项
    expect(classOptions.value[0]).toEqual({ label: '', value: null })
    expect(classOptions.value).toHaveLength(3)
    expect(classOptions.value[1].label).toBe('Class A')
  })

  it('form.classId 不在 classes 列表时不构造 "#id" 占位项', async () => {
    stubDeps({ classes: [{ id: 1, name: 'Class A' }] })
    setMockAuthUser(null)
    const { useUserProfileForm } = await import('../../composables/useUserProfileForm')
    const { classOptions } = useUserProfileForm(makeForm({ classId: 99 }))
    // 仅空选项 + Class A，不再插入 "#99" 之类的占位 option
    expect(classOptions.value).toHaveLength(2)
    expect(classOptions.value[0]).toEqual({ label: '', value: null })
    expect(classOptions.value.map((o: any) => o.value)).toEqual([null, 1])
    expect(classOptions.value.some((o: any) => String(o.value) === '99')).toBe(false)
  })
})

describe('composables/useUserProfileForm - triggerFileInput', () => {
  it('不可编辑头像时 triggerFileInput 不操作', async () => {
    stubDeps({ allowSelfAvatarUpload: false })
    setMockAuthUser({ id: 1, username: 'admin', name: 'Admin' }, [{ code: 'admin', name: 'Admin' }])
    const { useUserProfileForm } = await import('../../composables/useUserProfileForm')
    const { fileInputRef, triggerFileInput } = useUserProfileForm(makeForm())
    fileInputRef.value = { click: vi.fn() } as any
    triggerFileInput()
    expect((fileInputRef.value as any).click).not.toHaveBeenCalled()
  })

  it('可编辑头像时 triggerFileInput 调用 click', async () => {
    stubDeps({ allowSelfAvatarUpload: true })
    setMockAuthUser({ id: 1, username: 'admin', name: 'Admin' }, [{ code: 'admin', name: 'Admin' }])
    const { useUserProfileForm } = await import('../../composables/useUserProfileForm')
    const { fileInputRef, triggerFileInput } = useUserProfileForm(makeForm())
    const clickSpy = vi.fn()
    fileInputRef.value = { click: clickSpy } as any
    triggerFileInput()
    expect(clickSpy).toHaveBeenCalled()
  })
})

describe('composables/useUserProfileForm - onFileSelect', () => {
  it('非图片文件时弹错误 toast', async () => {
    setMockAuthUser({ id: 1, username: 'admin', name: 'Admin' }, [{ code: 'admin', name: 'Admin' }])
    const { useUserProfileForm } = await import('../../composables/useUserProfileForm')
    const { onFileSelect, cropperRef } = useUserProfileForm(makeForm())
    const setImageSpy = vi.fn()
    cropperRef.value = { setImage: setImageSpy }
    const target = { files: [new File(['x'], 'a.txt', { type: 'text/plain' })], value: '' } as any
    onFileSelect({ target } as any)
    expect(setImageSpy).not.toHaveBeenCalled()
  })

  it('图片文件时调用 cropperRef.setImage', async () => {
    setMockAuthUser({ id: 1, username: 'admin', name: 'Admin' }, [{ code: 'admin', name: 'Admin' }])
    const { useUserProfileForm } = await import('../../composables/useUserProfileForm')
    const { onFileSelect, cropperRef } = useUserProfileForm(makeForm())
    const setImageSpy = vi.fn()
    cropperRef.value = { setImage: setImageSpy }
    const file = new File(['img'], 'a.jpg', { type: 'image/jpeg' })
    const target = { files: [file], value: '' } as any
    onFileSelect({ target } as any)
    expect(setImageSpy).toHaveBeenCalledWith(file)
  })

  it('无文件时不操作', async () => {
    setMockAuthUser(null)
    const { useUserProfileForm } = await import('../../composables/useUserProfileForm')
    const { onFileSelect, cropperRef } = useUserProfileForm(makeForm())
    const setImageSpy = vi.fn()
    cropperRef.value = { setImage: setImageSpy }
    onFileSelect({ target: { files: [] } } as any)
    expect(setImageSpy).not.toHaveBeenCalled()
  })
})

describe('composables/useUserProfileForm - onCropped', () => {
  it('设置 form.avatarImg 并弹成功 toast', async () => {
    setMockAuthUser(null)
    const { useUserProfileForm } = await import('../../composables/useUserProfileForm')
    const form = makeForm()
    const { onCropped } = useUserProfileForm(form)
    onCropped('http://cdn.com/a.webp')
    expect(form.value.avatarImg).toBe('http://cdn.com/a.webp')
  })
})
