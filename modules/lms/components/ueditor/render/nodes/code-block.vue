<template>
  <div class="cb-wrapper" :class="`cb-theme-${theme}`">
    <div class="cb-header">
      <span class="cb-lang">{{ language }}</span>
      <div v-if="!hideActions" class="flex items-center gap-2">
        <button v-if="canRun" class="cb-run" @click="openRunner">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        </button>
        <button class="cb-copy" :class="{ copied }" @click="copyCode" v-html="copied ? checkIcon : copyIcon"></button>
      </div>
    </div>
    <div class="cb-main">
      <pre class="cb-lines" aria-hidden="true"><span v-for="n in lineCount" :key="n">{{ n }}</span></pre>
      <pre class="cb-code"><code v-html="highlightedHtml"></code></pre>
    </div>
    <IdeModal v-model:open="ideOpen" :code="codeText" :language="ideLanguage" />
    <!-- Python：改由外部在线运行器（codeflow）以 iframe 运行 -->
    <UModal v-model:open="codeflowOpen" :ui="{ content: 'max-w-5xl' }">
      <template #content>
        <div class="cb-codeflow">
          <iframe class="cb-codeflow-frame" :src="codeflowSrc" :title="$t('ide.title')" allow="clipboard-write" />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup>
import { useCodeBlock } from './useCodeBlock'
const props = defineProps({ node: { type: Object, required: true } })
const { hideActions, language, theme, canRun, ideLanguage, ideOpen, codeText, lineCount, highlightedHtml, copied, copyIcon, checkIcon, copyCode, codeflowOpen, codeflowSrc, openRunner } = useCodeBlock(props)
</script>

<style lang="less" src="./code-block.less"></style>
