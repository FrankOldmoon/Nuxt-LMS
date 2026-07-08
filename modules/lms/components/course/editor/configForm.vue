<template>
  <!--
    lms 模块课程编辑器配置表单包装组件（仅 lms 启用时使用）
    - 包裹 doc 的 <CourseEditorConfigForm>
    - 通过 lms-config slot 注入 <LmsConfigEditor hide-course>
    - 把 doc 侧的 initFromConfig / buildConfig 透传，并合并 lmsConfig
  -->
  <CourseEditorConfigForm ref="baseFormRef">
    <template #lms-config>
      <LmsConfigEditor
        ref="lmsRef"
        v-model="lmsConfig"
        hide-course
      />
    </template>
  </CourseEditorConfigForm>
</template>

<script setup lang="ts">
import CourseEditorConfigForm from '../../../../doc/components/course/editor/configForm.vue'
/**
 * lms 包装 doc 的课程编辑器配置表单
 *
 * - initFromConfig(cfg)：
 *   先调 baseFormRef.value?.initFromConfig(cfg) 让 doc 侧填充基础字段；
 *   再把 cfg.lmsConfig 注入本地 lmsConfig ref，触发 LmsConfigEditor 的 v-model 同步。
 * - buildConfig()：
 *   先调 baseFormRef.value?.buildConfig() 拿到 doc 侧基础 config（含 courseSwitches）；
 *   再用 lmsRef.value?.getConfig() 拿到 lms 侧各分组（不含 course，因为 hide-course）；
 *   把 base.courseSwitches 合并到 lmsData.course 保持原 doc 侧优先级；
 *   最终返回 `{ ...base, lmsConfig: lmsData }`。
 */
const baseFormRef = ref<{
  initFromConfig: (cfg: Record<string, any>) => void
  buildConfig: () => Record<string, any> | null
} | null>(null)

const lmsRef = ref<{
  getConfig: () => any
} | null>(null)

const lmsConfig = ref<any>(null)

function initFromConfig(cfg: Record<string, any>) {
  baseFormRef.value?.initFromConfig(cfg)
  lmsConfig.value = cfg?.lmsConfig || null
}

function buildConfig(): Record<string, any> | null {
  const base = baseFormRef.value?.buildConfig()
  if (!base) return null
  // lms 侧：含除 course 外的所有 lms_config 分组
  const lmsData = lmsRef.value?.getConfig() || {}
  // doc 侧的 courseSwitches 保持最高优先级（写入 lmsData.course）
  if (base.lmsConfig && base.lmsConfig.course) {
    lmsData.course = { ...lmsData.course, ...base.lmsConfig.course }
  } else {
    lmsData.course = (base as any).courseSwitches || lmsData.course
  }
  return { ...base, lmsConfig: lmsData }
}

defineExpose({ initFromConfig, buildConfig })
</script>
