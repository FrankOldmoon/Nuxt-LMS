<template>
  <div class="space-y-4">
    <!-- 基本信息（原 Basic Info tab，已并入 Display） -->
    <USeparator :label="$t('courseEditor.basicInfoSection')" class="my-4" />

    <UFormField :label="$t('courseEditor.name')" class="w-full">
      <UInput v-model="form.name" :placeholder="$t('courseEditor.namePlaceholder')" class="w-full" />
    </UFormField>

    <UFormField :label="$t('courseEditor.code')" class="w-full">
      <UInput v-model="form.code" :placeholder="$t('courseEditor.codePlaceholder')" class="w-full" />
    </UFormField>

    <UFormField :label="$t('courseEditor.tags')" class="w-full">
      <UInputTags v-model="form.tags" :placeholder="$t('courseEditor.tagsPlaceholder')" class="w-full" />
    </UFormField>

    <!-- 课程状态（仅管理员可见） -->
    <UFormField v-if="isAdmin" :label="$t('courseEditor.status')" class="w-full">
      <USelect v-model="form.status" :items="statusOpts" class="w-full" />
    </UFormField>

    <USeparator :label="$t('courseEditor.configSection')" class="my-4" />

    <UFormField :label="$t('courseEditor.icon')" class="w-full">
      <UInput v-model="config.icon" :placeholder="$t('courseEditor.iconPlaceholder')" class="w-full" />
    </UFormField>

    <UFormField :label="$t('courseEditor.color')" class="w-full">
      <USelect v-model="config.color" :items="colorOpts" class="w-full" />
    </UFormField>

    <UFormField :label="$t('courseEditor.level')" class="w-full">
      <USelect v-model="config.level" :items="levelOpts" class="w-full" />
    </UFormField>

    <!-- 自定义 config 参数（JSON） -->
    <UFormField :label="$t('courseEditor.extraConfig')" class="w-full">
      <UTextarea
        v-model="extraConfigText"
        :placeholder="$t('courseEditor.extraConfigPlaceholder')"
        :rows="3"
        class="w-full font-mono text-xs"
      />
      <p v-if="extraConfigError" class="text-xs text-error mt-1">{{ extraConfigError }}</p>
    </UFormField>

    <!-- 课程级 lmsConfig 覆盖（hide-course：course 分组开关由 Learning Config tab 单独管理） -->
    <LmsConfigEditor
      ref="lmsConfigRef"
      v-model="lmsConfig"
      hide-course
    />
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const { hasRole } = useAuth()
const isAdmin = computed(() => hasRole('admin'))

const statusOpts = computed(() => [
  { label: t('courseEditor.statusPublished'), value: 'published' },
  { label: t('courseEditor.statusDraft'), value: 'draft' },
  { label: t('courseEditor.statusArchived'), value: 'archived' },
])

const {
  form,
  config,
  extraConfigText, extraConfigError, lmsConfigRef, lmsConfig,
  colorOpts, levelOpts,
  initFromConfig, buildConfig,
} = useCourseConfigFormContext()

defineExpose({ initFromConfig, buildConfig })
</script>
