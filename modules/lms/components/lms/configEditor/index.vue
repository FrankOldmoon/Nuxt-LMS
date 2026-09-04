<template>
  <div class="space-y-4">
    <USeparator :label="$t('lmsConfig.title')" class="my-4" />
    <LmsConfigEditorUserSection />
    <LmsConfigEditorAiSection />
    <LmsConfigEditorExpSections />
    <LmsConfigEditorSwitchSections />
    <LmsConfigEditorDanmakuSection />
    <LmsConfigEditorGridSections />
    <LmsConfigEditorOjSection />
    <LmsConfigEditorAnalyticsSection />
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: Record<string, any> | null
  hideCourse?: boolean
}>(), {
  modelValue: null,
  hideCourse: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, any>]
}>()

const ctx = useConfigEditor(props, emit)
provideConfigEditor(ctx)

defineExpose({ getConfig: ctx.getConfig })
</script>
