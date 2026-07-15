<template>
  <!-- AI helpHandConfiguration -->
  <div class="space-y-2">
    <p class="text-sm font-medium">{{ $t('lmsConfig.ai') }}</p>
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <div>
          <span class="text-xs">{{ $t('lmsConfig.aiEnabled') }}</span>
          <p class="text-[10px] text-muted">{{ $t('lmsConfig.aiEnabledHint') }}</p>
        </div>
        <USwitch v-model="config.ai.enabled" />
      </div>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <UFormField :label="$t('lmsConfig.aiMode')" size="xs">
        <USelect v-model="config.ai.mode" :items="aiModeOpts" size="xs" class="w-full" />
      </UFormField>
      <UFormField :label="$t('lmsConfig.aiTtsGender')" size="xs">
        <USelect v-model="config.ai.ttsGender" :items="ttsGenderOpts" size="xs" class="w-full" />
      </UFormField>

      <!-- API mode：Model + LLM API Address + Key + thinking mode -->
      <template v-if="config.ai.mode === 'api'">
        <UFormField :label="$t('lmsConfig.aiModel')" size="xs" class="col-span-2">
          <UInput v-model="config.ai.model" :placeholder="$t('lmsConfig.aiModelPlaceholder')" size="xs" class="w-full" />
        </UFormField>
        <UFormField :label="$t('lmsConfig.aiLlmApiUrl')" size="xs" class="col-span-2">
          <template #hint>{{ $t('lmsConfig.aiLlmApiUrlHint') }}</template>
          <UInput v-model="config.ai.llmApiUrl" :placeholder="$t('lmsConfig.aiLlmApiUrlPlaceholder')" size="xs" class="w-full" />
        </UFormField>
        <UFormField :label="$t('lmsConfig.aiLlmApiKey')" size="xs" class="col-span-2">
          <template #hint>{{ $t('lmsConfig.aiLlmApiKeyHint') }}</template>
          <UInput v-model="config.ai.llmApiKey" type="password" :placeholder="$t('lmsConfig.aiLlmApiKeyPlaceholder')" size="xs" class="w-full" />
        </UFormField>
        <UFormField :label="$t('lmsConfig.aiThinking')" size="xs">
          <USwitch v-model="config.ai.thinking" />
        </UFormField>
      </template>

      <!-- Ollama mode：ServiceAddress + Modelname -->
      <template v-if="config.ai.mode === 'ollama'">
        <UFormField :label="$t('lmsConfig.aiOllamaUrl')" size="xs" class="col-span-2">
          <UInput v-model="config.ai.ollamaUrl" placeholder="http://localhost:11434" size="xs" class="w-full" />
        </UFormField>
        <UFormField :label="$t('lmsConfig.aiOllamaModel')" size="xs" class="col-span-2">
          <UInput v-model="config.ai.ollamaModel" placeholder="llama3.2" size="xs" class="w-full" />
        </UFormField>
      </template>

      <!-- commonuse：Serviceserver proxy endpointPoint（FrontserverCallAPI，non LLM providerAddress） -->
      <UFormField :label="$t('lmsConfig.aiApiUrl')" size="xs" class="col-span-2">
        <UInput v-model="config.ai.apiUrl" placeholder="/api/aichat/chat" size="xs" class="w-full" />
      </UFormField>
      <UFormField :label="$t('lmsConfig.aiTitle')" size="xs">
        <UInput v-model="config.ai.title" size="xs" class="w-full" />
      </UFormField>
      <UFormField :label="$t('lmsConfig.aiPreset')" size="xs" class="col-span-2">
        <UTextarea v-model="config.ai.preset" :rows="2" size="xs" class="w-full" />
      </UFormField>
      <UFormField :label="$t('lmsConfig.aiOpening')" size="xs" class="col-span-2">
        <UTextarea v-model="config.ai.opening" :rows="2" size="xs" class="w-full" />
      </UFormField>
    </div>
  </div>
</template>

<script setup lang="ts">
const { config, aiModeOpts, ttsGenderOpts } = useConfigEditorContext()
</script>
