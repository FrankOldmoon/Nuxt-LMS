<template>
  <!-- 右下角 AI 章节助教 + VRM 数字人 -->
  <div v-if="aiEnabled" class="fixed bottom-16 right-6 z-50 flex flex-col items-end gap-3">
    <Transition enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-4 scale-95" enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100" leave-to-class="opacity-0 translate-y-4 scale-95">
      <div v-if="assistantOpen" class="flex flex-col lg:flex-row gap-3 items-end lg:items-start">
        <ClientOnly>
          <AiVrm v-if="vrmVisible" class="order-2 lg:order-1" @close="vrmVisible = false" />
        </ClientOnly>
        <div class="order-1 lg:order-2 w-[400px] max-w-[calc(100vw-3rem)] bg-default rounded-xl shadow-2xl border border-default overflow-hidden">
          <div class="p-3">
            <AiLlm ref="aiLlmRef" :show-settings="false" :title="$t('ai.chapterAssistant')"
              :preset="assistantPreset" :opening="assistantOpening" :ai-config="aiConfig"
              @chunk="onAssistantChunk" @user-message="onAssistantUserMessage" @message="onAssistantMessage" />
          </div>
        </div>
      </div>
    </Transition>
    <UButton :icon="assistantOpen ? 'i-lucide-x' : 'i-lucide-bot'" color="primary" size="xl"
      class="rounded-full shadow-lg size-14 flex items-center justify-center"
      :title="$t('ai.chapterAssistantHint')" :aria-label="$t('ai.chapterAssistant')" @click="toggleAssistant" />
  </div>
</template>

<script setup lang="ts">
const {
  aiEnabled, aiConfig, assistantOpen, vrmVisible, aiLlmRef,
  assistantPreset, assistantOpening,
  toggleAssistant, onAssistantChunk, onAssistantUserMessage, onAssistantMessage,
} = useChapterViewContext()
</script>
