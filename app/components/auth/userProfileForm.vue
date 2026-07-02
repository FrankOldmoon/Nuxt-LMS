<template>
  <div class="space-y-4">
    <div class="flex justify-center mb-6">
      <UAvatar :src="form.avatarImg" :alt="form.name" size="2xl" :text="form.name?.charAt(0)" />
    </div>
    <UFormField :label="$t('profile.avatarImg')" class="w-full">
      <UInput v-model="form.avatarImg" :placeholder="$t('profile.avatarImgPlaceholder')" class="w-full" />
    </UFormField>
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
      <USelect
        v-model="form.gender"
        :items="genderOptions"
        :placeholder="$t('profile.genderPlaceholder')"
        class="w-full"
      />
    </UFormField>
    <UFormField :label="$t('profile.rollNumber')" class="w-full">
      <UInput v-model="form.rollNumber" :placeholder="$t('profile.rollNumberPlaceholder')" class="w-full" />
    </UFormField>
    <UFormField :label="$t('profile.telephone')" class="w-full">
      <UInput v-model="form.telephone" :placeholder="$t('profile.telephonePlaceholder')" class="w-full" />
    </UFormField>
    <UFormField :label="$t('profile.class')" class="w-full">
      <USelect
        v-model="form.classId"
        :items="classOptions"
        :placeholder="$t('profile.classPlaceholder')"
        class="w-full"
      />
    </UFormField>
  </div>
</template>

<script setup lang="ts">
import type { UserProfileForm } from '#shared/types/lms'

const form = defineModel<UserProfileForm>({ required: true })

const { classOptions, loadClasses } = useClasses()
const genderOptions = useGenderOptions()

// 组件挂载时加载班级列表
loadClasses()
</script>
