<template>
  <!--
    lms 模块设置弹窗包装组件（仅 lms 启用时使用）
    - 包裹 base 的 <AuthSettingsModal>
    - 通过 lms-config slot 注入 <LmsConfigEditor>
    - 通过 on-save 回调把"提交 lms_config"的 async 函数注册到 base
  -->
  <AuthSettingsModal v-model:open="isOpen">
    <template #settings-extra="{ onSave }">
      <div v-if="loading" class="flex justify-center py-4">
        <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin text-muted" />
      </div>
      <LmsConfigEditor v-show="!loading" ref="editorRef" v-model="lmsConfig" />
      <span v-if="!loading" hidden>{{ onSave(submitLmsConfig) }}</span>
    </template>
  </AuthSettingsModal>
</template>

<script setup lang="ts">
import AuthSettingsModal from '../../../base/components/auth/settingsModal.vue'
/**
 * lms 包装 settingsModal
 *
 * 关键点：
 * - 不再渲染 site_config / 邮件 UI（由 base 完成）
 * - 仅负责在 lms-config slot 中展示 LmsConfigEditor
 * - 通过 slotProps.onSave 把"提交 lms_config"的 async 函数注册到 base
 * - 注册的回调在 lmsConfig / editorRef 就绪后立即调用
 */
const isOpen = defineModel<boolean>('open', { default: false })

const loading = ref(false)
const editorRef = ref<{ getConfig: () => any } | null>(null)
const lmsConfig = ref<any>({})

watch(isOpen, async (val) => {
  if (val) await loadLmsConfig()
})

async function loadLmsConfig() {
  loading.value = true
  try {
    const data = await cRequest<any>('/api/config/get')
    lmsConfig.value = data || {}
  } catch {
    lmsConfig.value = {}
  } finally {
    loading.value = false
  }
}

/**
 * 实际提交 lms_config 的异步函数
 * 调 LmsConfigEditor.getConfig() 获取最终对象，deep-merge 入库
 */
async function submitLmsConfig(): Promise<void> {
  if (!editorRef.value) return
  const data = editorRef.value.getConfig() || {}
  // /api/lms-config/update 服务端是 deep-merge，这里把整个 config 传过去即可
  // （路径原为 /api/config/update，与 base 模块同名冲突，base 先注册会覆盖 lms 路由）
  await cRequest('/api/lms-config/update', {
    method: 'POST',
    body: data,
  })
}

/**
 * 把 submitLmsConfig 注册到 base 的 slotSaveHandler。
 * Vue 3 slot 渲染时，slotProps.onSave 是一个函数引用，
 * 在模板里直接调用即可把它注册到 base。
 */
</script>
