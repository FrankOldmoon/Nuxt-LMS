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
        <UFormField :label="$t('profile.class')" class="w-full">
            <USelect v-model="form.classId" :items="classOptions" :placeholder="$t('profile.classPlaceholder')"
                class="w-full" />
        </UFormField>
        <template v-if="hasRole('admin')">
            <UFormField :label="$t('profile.teachingClasses')" class="w-full">
                <USelectMenu v-if="multiClassOptions.length" v-model="teachingClassIdsModel" :items="multiClassOptions"
                    :placeholder="$t('profile.teachingClassesPlaceholder')" multiple class="w-full" />
            </UFormField>
            <UFormField :label="$t('profile.teachingCourses')" class="w-full">
                <USelectMenu v-if="courseOptions.length" v-model="teachingCourseIdsModel" :items="courseOptions"
                    :placeholder="$t('profile.teachingCoursesPlaceholder')" multiple class="w-full" />
            </UFormField>
            <UFormField :label="$t('profile.editorCourses')" class="w-full">
                <USelectMenu v-if="courseOptions.length" v-model="editorCourseIdsModel" :items="courseOptions"
                    :placeholder="$t('profile.editorCoursesPlaceholder')" multiple class="w-full" />
            </UFormField>
        </template>

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
import type { UserProfileForm } from '#shared/types/lms'
const { hasRole, isCourseEditor } = useAuth()
const form = defineModel<UserProfileForm>({ required: true })
const teachingClassIds = defineModel<number[]>('teachingClassIds', { default: () => [] })
const teachingCourseIds = defineModel<number[]>('teachingCourseIds', { default: () => [] })
const editorCourseIds = defineModel<number[]>('editorCourseIds', { default: () => [] })

const toast = useToast()
const { t } = useI18n()

const { classes, classOptions, loadClasses } = useClasses()
const { courseOptions, loadCourses } = useCourses()
const genderOptions = useGenderOptions()

const multiClassOptions = computed(() =>
    classes.value.map((c) => ({ label: c.name, value: c.id })),
)

type SelectOption = { label: string; value: number }

// USelectMenu multiple 模式下 v-model 绑定的是完整对象数组，需要做转换
const teachingClassIdsModel = computed<SelectOption[]>({
    get: () => multiClassOptions.value.filter((o) => teachingClassIds.value.includes(o.value)),
    set: (vals) => { teachingClassIds.value = vals.map((v) => v.value) },
})
const teachingCourseIdsModel = computed<SelectOption[]>({
    get: () => courseOptions.value.filter((o) => teachingCourseIds.value.includes(o.value)),
    set: (vals) => { teachingCourseIds.value = vals.map((v) => v.value) },
})
const editorCourseIdsModel = computed<SelectOption[]>({
    get: () => courseOptions.value.filter((o) => editorCourseIds.value.includes(o.value)),
    set: (vals) => { editorCourseIds.value = vals.map((v) => v.value) },
})

const fileInputRef = ref<HTMLInputElement>()
const uploading = ref(false)

// 修改密码
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

    // 校验文件类型和大小
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
        // 清除 input 值，允许重复上传同一文件
        target.value = ''
    }
}

// 组件挂载时加载班级和课程列表
loadClasses()
loadCourses()
</script>
