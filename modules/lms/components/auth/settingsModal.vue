<template>
  <!--
    lms ModuleSettingsModalwrapComponent（only lms Enablewhenmakeuse）
    - wrap base  <AuthSettingsModal>
    - Pass lms-config slot inject <LmsConfigEditor>
    - Pass on-save Callback"Submit lms_config" async FunctionRegisterto base
  -->
  <AuthSettingsModal v-model:open="isOpen">
    <template #settings-extra="{ on save }">
      <div v-if="loading" class="flex justify-center py-4">
        <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin text-muted" />
      </div>
      <LmsConfigEditor v-show="!loading" ref="editorRef" v-model="lmsConfig" />
      <span v-if="!loading" hidden>{{ on save(submitLmsConfig) }}</span>
    </template>
  </AuthSettingsModal>
</template>

<script setup lang="ts">
import AuthSettingsModal from '../../../base/components/auth/settings/modal.vue'
/**
 * lms wrap settingsModal
 *
 * OffKeyPoint：
 * - nothenRender site_config / email UI（by base Complete）
 * - only responsible lms-config slot Middledisplay LmsConfigEditor
 * - Pass slotProps.on save "Submit lms_config" async FunctionRegisterto base
 * - RegisterCallback lmsConfig / editorRef thenstateBackimmediatelythat isCall
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
    const data = await cRequest<any>('/api/config/lms-public')
    lmsConfig.value = data || {}
  } catch {
    lmsConfig.value = {}
  } finally {
    loading.value = false
  }
}

/**
 * Async function that actually submits lms_config
 * Calls LmsConfigEditor.getConfig() to get the final object, deep-merges into storage
 */
async function submitLmsConfig(): Promise<void> {
  if (!editorRef.value) return
  const data = editorRef.value.getConfig() || {}
  // /api/lms-config/update ServiceserverYes deep-merge，ThisInsidewholeitems config pass tothat iscan
  // （path original /api/config/update，and base Modulesamename conflict，base firstRegisterwilloverlay lms routeby）
  await cRequest('/api/lms-config/update', {
    method: 'POST',
    body: data,
  })
}

/**
 * Register submitLmsConfig to base's slotSaveHandler.
 * When Vue 3 renders the slot, slotProps.on save is a function reference,
 * calling it directly in the template registers it to base.
 */
</script>
