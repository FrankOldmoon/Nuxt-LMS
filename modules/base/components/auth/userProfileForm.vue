<template>
  <div class="space-y-4">
    <!-- 头像上传区域 -->
    <div class="flex flex-col items-center mb-6">
      <div class="relative cursor-pointer group" :class="{ 'pointer-events-none opacity-60': !canEditAvatar }"
        @click="triggerFileInput" role="button" tabindex="0" @keydown.enter.prevent="triggerFileInput"
        @keydown.space.prevent="triggerFileInput">
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
    <FormImageCropperModal ref="cropperRef" :title="$t('profile.cropAvatar')" :aspect-ratio="1"
      stencil-type="circle" :output-size="{ width: 128, height: 128 }" @uploaded="onCropped" />

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
    <UFormField :label="$t('profile.class')" class="w-full">
      <USelect v-model="form.classId" :items="classOptions" :placeholder="$t('profile.classPlaceholder')"
        class="w-full" :disabled="!canEditClass" />
    </UFormField>
    <UFormField :label="$t('profile.telephone')" class="w-full">
      <UInput v-model="form.telephone" :placeholder="$t('profile.telephonePlaceholder')" class="w-full" />
    </UFormField>

    <!-- 修改密码 -->
    <div class="pt-2">
      <UButton :label="$t('profile.changePassword')" icon="i-lucide-key-round" color="neutral" variant="outline"
        size="sm" :disabled="!canEditPassword" @click="() => { showPwdModal = true }" />
    </div>
  </div>

  <!-- 修改密码弹窗 -->
  <AuthUserProfilePasswordModal v-model:open="showPwdModal" />
</template>

<script setup lang="ts">
interface UserProfileForm {
  name: string
  preferName: string
  englishName: string
  email: string
  gender: string
  avatarImg: string
  telephone: string
  classId: number | null
}

const form = defineModel<UserProfileForm>({ required: true })

const {
  canEditGeneral, canEditAvatar, canEditClass, canEditEmail, canEditPassword,
  genderOptions, classOptions,
  fileInputRef, uploading, cropperRef, showPwdModal,
  triggerFileInput, onFileSelect, onCropped,
} = useUserProfileForm(form)
</script>
