<template>
  <div class="space-y-4">
    <USeparator :label="$t('courseEditor.configSection')" class="my-4" />

    <!-- Cover Imageimage -->
    <UFormField :label="$t('courseEditor.coverImage')" class="w-full">
      <div class="flex items-center gap-3">
        <div v-if="coverImg" class="relative group">
          <img :src="coverImg" class="w-32 h-20 object-cover rounded-lg border border-default" />
          <button
            class="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            @click="coverImg = ''"
          >×</button>
        </div>
        <UButton
          :icon="coverImg ? 'i-lucide-refresh-cw' : 'i-lucide-image-plus'"
          variant="outline"
          size="sm"
          :loading="uploading"
          @click="triggerCoverUpload"
        />
        <input ref="coverInputRef" type="file" accept="image/*" class="hidden" @change="onCoverFileSelected" />
      </div>
    </UFormField>

    <FormImageCropperModal
      ref="cropperRef"
      :title="$t('courseEditor.cropCover')"
      :aspect-ratio="16/10"
      stencil-type="rectangle"
      @uploaded="onCropped"
    />

    <UFormField :label="$t('courseEditor.icon')" class="w-full">
      <UInput v-model="config.icon" :placeholder="$t('courseEditor.iconPlaceholder')" class="w-full" />
    </UFormField>

    <UFormField :label="$t('courseEditor.color')" class="w-full">
      <USelect v-model="config.color" :items="colorOpts" class="w-full" />
    </UFormField>

    <UFormField :label="$t('courseEditor.level')" class="w-full">
      <USelect v-model="config.level" :items="levelOpts" class="w-full" />
    </UFormField>

    <!-- config on/offitems（Datadriven：v-for Render courseSwitchList） -->
    <div class="space-y-3">
      <div v-for="sw in courseSwitchList" :key="sw.key" class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium">{{ $t(sw.label) }}</p>
          <p class="text-xs text-muted">{{ $t(sw.hint) }}</p>
        </div>
        <USwitch v-model="courseSwitches[sw.key]" />
      </div>
    </div>

    <!-- custom config Parameter（JSON） -->
    <UFormField :label="$t('courseEditor.extraConfig')" class="w-full">
      <UTextarea
        v-model="extraConfigText"
        :placeholder="$t('courseEditor.extraConfigPlaceholder')"
        :rows="3"
        class="w-full font-mono text-xs"
      />
      <p v-if="extraConfigError" class="text-xs text-error mt-1">{{ extraConfigError }}</p>
    </UFormField>

    <!-- Courselevel lmsConfig overlay（hide-course：course Groupon/offbyUpmanaged separately by above） -->
    <LmsConfigEditor
      ref="lmsConfigRef"
      v-model="lmsConfig"
      hide-course
    />
  </div>
</template>

<script setup lang="ts">
const {
  config, coverImg, uploading, coverInputRef, cropperRef,
  courseSwitches, courseSwitchList,
  extraConfigText, extraConfigError, lmsConfigRef, lmsConfig,
  colorOpts, levelOpts,
  triggerCoverUpload, onCoverFileSelected, onCropped,
  initFromConfig, buildConfig,
} = useCourseConfigForm()

defineExpose({ initFromConfig, buildConfig })
</script>
