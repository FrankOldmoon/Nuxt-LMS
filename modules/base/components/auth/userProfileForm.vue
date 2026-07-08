<template>
    <div class="space-y-4">
        <!-- 头像上传区域 -->
        <div class="flex flex-col items-center mb-6">
            <div class="relative cursor-pointer group" :class="{ 'pointer-events-none opacity-60': !canEditAvatar }"
                @click="triggerFileInput" role="button" tabindex="0"
                @keydown.enter.prevent="triggerFileInput" @keydown.space.prevent="triggerFileInput">
                <UAvatar :src="form.avatarImg" :alt="form.name" size="2xl" :text="form.name?.charAt(0)"
                    class="transition-opacity group-hover:opacity-70" />
                <div v-if="canEditAvatar"
                    class="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <UIcon :name="uploading ? 'i-lucide-loader-circle' : 'i-lucide-camera'" class="size-6 text-white"
                        :class="{ 'animate-spin': uploading }" />
                </div>
            </div>
            <p v-if="canEditAvatar" class="text-xs text-(--ui-text-dimmed) mt-2">
                {{ $t('profile.clickToUploadAvatar') }}
            </p>
            <input ref="fileInputRef" type="file" accept="image/*" class="hidden" @change="onFileSelect" />
        </div>

        <!-- 图片裁剪弹窗 -->
        <FormImageCropperModal
            ref="cropperRef"
            :title="$t('profile.cropAvatar')"
            :aspect-ratio="1"
            stencil-type="circle"
            @uploaded="onCropped"
        />
        <UFormField :label="$t('profile.name')" class="w-full">
            <UInput v-model="form.name" :placeholder="$t('profile.namePlaceholder')" class="w-full"
                :disabled="!canEditGeneral" />
        </UFormField>
        <UFormField :label="$t('profile.preferName')" class="w-full">
            <UInput v-model="form.preferName" :placeholder="$t('profile.preferNamePlaceholder')" class="w-full"
                :disabled="!canEditGeneral" />
        </UFormField>
        <UFormField :label="$t('profile.englishName')" class="w-full">
            <UInput v-model="form.englishName" :placeholder="$t('profile.englishNamePlaceholder')" class="w-full"
                :disabled="!canEditGeneral" />
        </UFormField>
        <UFormField :label="$t('profile.email')" class="w-full">
            <UInput v-model="form.email" type="email" :placeholder="$t('profile.emailPlaceholder')" class="w-full"
                :disabled="!canEditEmail" />
        </UFormField>
        <UFormField :label="$t('profile.gender')" class="w-full">
            <USelect v-model="form.gender" :items="genderOptions" :placeholder="$t('profile.genderPlaceholder')"
                class="w-full" :disabled="!canEditGeneral" />
        </UFormField>
        <UFormField :label="$t('profile.rollNumber')" class="w-full">
            <UInput v-model="form.rollNumber" :placeholder="$t('profile.rollNumberPlaceholder')" class="w-full"
                :disabled="!canEditGeneral" />
        </UFormField>
        <UFormField v-if="moduleLms" :label="$t('profile.class')" class="w-full">
            <USelect v-model="form.classId" :items="classOptions" :placeholder="$t('profile.classPlaceholder')"
                class="w-full" :disabled="!canEditClass" />
        </UFormField>
        <UFormField :label="$t('profile.telephone')" class="w-full">
            <UInput v-model="form.telephone" :placeholder="$t('profile.telephonePlaceholder')" class="w-full" />
        </UFormField>

        <!-- 修改密码 -->
        <div class="pt-2">
            <UButton :label="$t('profile.changePassword')" icon="i-lucide-key-round" color="neutral" variant="outline"
                size="sm" :disabled="!canEditPassword" @click="showPwdModal = true" />
        </div>
    </div>

    <!-- 修改密码弹窗 -->
    <UModal v-model:open="showPwdModal" :ui="{ content: 'sm:max-w-sm' }">
        <template #content>
            <div class="p-6 space-y-4">
                <h3 class="text-lg font-semibold">{{ $t('profile.changePassword') }}</h3>
                <UFormField :label="$t('profile.oldPassword')" required>
                    <UInput v-model="pwdForm.oldPassword" type="password"
                        :placeholder="$t('profile.oldPasswordPlaceholder')" class="w-full" />
                </UFormField>
                <UFormField :label="$t('profile.newPassword')" required>
                    <UInput v-model="pwdForm.newPassword" type="password"
                        :placeholder="$t('profile.newPasswordPlaceholder')" class="w-full" />
                </UFormField>
                <UFormField :label="$t('profile.confirmNewPassword')" required
                    :error="pwdForm.newPassword && pwdForm.confirmPassword && pwdForm.newPassword !== pwdForm.confirmPassword ? $t('profile.passwordMismatch') : ''">
                    <UInput v-model="pwdForm.confirmPassword" type="password"
                        :placeholder="$t('profile.confirmNewPasswordPlaceholder')" class="w-full" />
                </UFormField>
                <div class="flex justify-end gap-2 pt-2">
                    <UButton :label="$t('common.cancel')" color="neutral" variant="ghost"
                        @click="showPwdModal = false" />
                    <UButton :label="$t('common.confirm')" color="primary" :loading="pwdSaving"
                        :disabled="!pwdForm.oldPassword || !pwdForm.newPassword || pwdForm.newPassword !== pwdForm.confirmPassword"
                        @click="submitChangePassword" />
                </div>
            </div>
        </template>
    </UModal>
</template>

<script setup lang="ts">
interface UserProfileForm {
  name: string
  preferName: string
  englishName: string
  email: string
  gender: string
  avatarImg: string
  rollNumber: string
  telephone: string
  classId: number | null
}

const form = defineModel<UserProfileForm>({ required: true })

const toast = useToast()
const { t } = useI18n()
const { hasRole } = useAuth()
const { classes, loadClasses } = useClasses()
// 班级为 lms 概念，仅 lms 启用时显示班级字段
const { moduleLms } = useRuntimeConfig().public

// lms 启用时读取 allowSelfAvatarUpload 等用户端功能开关；lms 禁用时该 ref 为 undefined 视为允许
// 注意：lms 禁用时不应依赖 useUserProfileConfig（避免跨模块依赖）。
// 但因 useUserProfileConfig 在 lms 禁用时仍可正常调用（返回 true），安全。
const {
  allowSelfAvatarUpload,
  allowChangePassword,
  allowChangeEmail,
} = useUserProfileConfig()

// ===================== 基于当前用户角色的可编辑性 =====================
// 学生端：只有手机和密码可改，其它只读
// 班级：仅管理员可改，其它角色只读
// 头像上传：lms_config.user.allowSelfAvatarUpload=false 时，所有用户均受限制（含 admin/teacher）
// 邮箱修改：lms_config.user.allowChangeEmail=false 时，非 admin/teacher 角色不可改
// 密码修改：lms_config.user.allowChangePassword=false 时，非 admin/teacher 角色不可改
// 其它通用字段（name/...）：仍由 admin/teacher 角色决定
const canEditGeneral = computed(() => hasRole('admin') || hasRole('teacher'))
const canEditAvatar = computed(() => allowSelfAvatarUpload.value && canEditGeneral.value)
const canEditClass = computed(() => hasRole('admin'))
const canEditEmail = computed(() => allowChangeEmail.value && canEditGeneral.value)
const canEditPassword = computed(() => allowChangePassword.value && canEditGeneral.value)

const genderOptions = computed(() => [
  { label: t('profile.genderMale'), value: 'male' },
  { label: t('profile.genderFemale'), value: 'female' },
  { label: t('profile.genderOther'), value: 'other' },
])

// 班级下拉选项：全局缓存 + 确保当前值始终有对应项（非 admin 时全局列表可能不含被编辑用户的班级）
const classOptions = computed(() => {
  const opts = classes.value.map((c) => ({ label: c.name, value: c.id }))
  if (form.value.classId != null && !opts.some((o) => o.value === form.value.classId)) {
    opts.unshift({ label: `${t('profile.class')} #${form.value.classId}`, value: form.value.classId })
  }
  return [{ label: '', value: null }, ...opts]
})

const fileInputRef = ref<HTMLInputElement>()
const uploading = ref(false)
const cropperRef = ref<{ setImage: (file: File) => void } | null>(null)

const showPwdModal = ref(false)
const pwdSaving = ref(false)
const pwdForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })

// 加载班级列表（全局缓存，仅加载一次）
onMounted(() => {
  loadClasses()
})

async function submitChangePassword() {
  if (pwdForm.newPassword !== pwdForm.confirmPassword) {
    toast.add({ title: t('profile.passwordMismatch'), color: 'error' })
    return
  }
  pwdSaving.value = true
  try {
    await cRequest('/api/auth/change-password', {
      method: 'POST',
      body: {
        oldPassword: pwdForm.oldPassword,
        newPassword: pwdForm.newPassword,
      },
    })
    toast.add({ title: t('profile.passwordChanged'), color: 'success' })
    showPwdModal.value = false
    pwdForm.oldPassword = ''
    pwdForm.newPassword = ''
    pwdForm.confirmPassword = ''
  } catch (e: any) {
    toast.add({ title: e.message || t('profile.passwordChangeFailed'), color: 'error' })
  } finally {
    pwdSaving.value = false
  }
}

function triggerFileInput() {
    if (!canEditAvatar.value) return
    fileInputRef.value?.click()
}

async function onFileSelect(e: Event) {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return
    target.value = ''

    if (!file.type.startsWith('image/')) {
        toast.add({ title: t('profile.invalidImageType'), color: 'error' })
        return
    }

    // 打开裁剪弹窗
    cropperRef.value?.setImage(file)
}

// 裁剪完成后更新头像
function onCropped(url: string) {
    form.value.avatarImg = url
    toast.add({ title: t('profile.uploadSuccess'), color: 'success' })
}
</script>
