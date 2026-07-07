<template>
    <div class="space-y-4">
        <!-- 头像上传区域 -->
        <div class="flex flex-col items-center mb-6">
            <div class="relative cursor-pointer group" @click="triggerFileInput" role="button" tabindex="0"
                @keydown.enter.prevent="triggerFileInput" @keydown.space.prevent="triggerFileInput">
                <UAvatar :src="form.avatarImg" :alt="form.name" size="2xl" :text="form.name?.charAt(0)"
                    class="transition-opacity group-hover:opacity-70" />
                <div
                    class="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <UIcon :name="uploading ? 'i-lucide-loader-circle' : 'i-lucide-camera'" class="size-6 text-white"
                        :class="{ 'animate-spin': uploading }" />
                </div>
            </div>
            <p class="text-xs text-(--ui-text-dimmed) mt-2">
                {{ $t('profile.clickToUploadAvatar') }}
            </p>
            <input ref="fileInputRef" type="file" accept="image/*" class="hidden" @change="onFileSelect" />
        </div>
        <UFormField :label="$t('profile.name')" class="w-full">
            <UInput v-model="form.name" :placeholder="$t('profile.namePlaceholder')" class="w-full" />
        </UFormField>
        <UFormField :label="$t('profile.preferName')" class="w-full">
            <UInput v-model="form.preferName" :placeholder="$t('profile.preferNamePlaceholder')" class="w-full" />
        </UFormField>
        <UFormField :label="$t('profile.englishName')" class="w-full">
            <UInput v-model="form.englishName" :placeholder="$t('profile.englishNamePlaceholder')" class="w-full" />
        </UFormField>
        <UFormField :label="$t('profile.email')" class="w-full">
            <UInput v-model="form.email" type="email" :placeholder="$t('profile.emailPlaceholder')" class="w-full" />
        </UFormField>
        <UFormField :label="$t('profile.gender')" class="w-full">
            <USelect v-model="form.gender" :items="genderOptions" :placeholder="$t('profile.genderPlaceholder')"
                class="w-full" />
        </UFormField>
        <UFormField :label="$t('profile.rollNumber')" class="w-full">
            <UInput v-model="form.rollNumber" :placeholder="$t('profile.rollNumberPlaceholder')" class="w-full" />
        </UFormField>
        <UFormField :label="$t('profile.telephone')" class="w-full">
            <UInput v-model="form.telephone" :placeholder="$t('profile.telephonePlaceholder')" class="w-full" />
        </UFormField>

        <!-- 修改密码 -->
        <div class="pt-2">
            <UButton :label="$t('profile.changePassword')" icon="i-lucide-key-round" color="neutral" variant="outline"
                size="sm" @click="showPwdModal = true" />
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

const genderOptions = computed(() => [
  { label: t('profile.genderMale'), value: 'male' },
  { label: t('profile.genderFemale'), value: 'female' },
  { label: t('profile.genderOther'), value: 'other' },
])

const fileInputRef = ref<HTMLInputElement>()
const uploading = ref(false)

const showPwdModal = ref(false)
const pwdSaving = ref(false)
const pwdForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })

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
    fileInputRef.value?.click()
}

async function onFileSelect(e: Event) {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
        toast.add({ title: t('profile.invalidImageType'), color: 'error' })
        return
    }
    if (file.size > 5 * 1024 * 1024) {
        toast.add({ title: t('profile.imageTooLarge'), color: 'error' })
        return
    }

    uploading.value = true
    try {
        const formData = new FormData()
        formData.append('files', file)

        const resp = await $fetch<{ data: { url: string }; success: boolean; msg: string }>('/api/upload', {
            method: 'POST',
            body: formData,
        })

        if (!resp.success) {
            throw new Error(resp.msg || t('profile.uploadFailed'))
        }

        form.value.avatarImg = resp.data.url
        toast.add({ title: t('profile.uploadSuccess'), color: 'success' })
    } catch (e: any) {
        toast.add({ title: e.message || t('profile.uploadFailed'), color: 'error' })
    } finally {
        uploading.value = false
        target.value = ''
    }
}
</script>
