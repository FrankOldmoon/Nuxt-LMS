<template>
  <UModal v-model:open="open">
    <template #content>
      <div class="p-4 space-y-4">
        <!-- Teacher：HairraiseVote -->
        <template v-if="canEdit">
          <template v-if="!activeVoteId">
            <h3 class="text-base font-semibold">{{ $t('chapter.vote') }}</h3>
            <UInput v-model="question" :placeholder="$t('chapter.voteQuestionPlaceholder')" />
            <div v-for="(opt, i) in options" :key="i" class="flex items-center gap-2">
              <UInput v-model="options[i]" :placeholder="`${$t('chapter.voteOption')} ${i + 1}`" class="flex-1" />
              <UButton v-if="options.length > 2" icon="i-lucide-x" size="xs" variant="ghost" color="error" @click="removeOption(i)" />
            </div>
            <UButton icon="i-lucide-plus" size="xs" variant="outline" :label="$t('chapter.voteAddOption')" @click="addOption" />
            <UButton :label="$t('chapter.voteStart')" color="primary" size="sm" class="w-full" :disabled="!canStartVote" @click="startVote" />
          </template>

          <!-- Teacher：ViewVoteProgress -->
          <template v-else>
            <div class="flex items-center justify-between">
              <h3 class="text-base font-semibold">{{ $t('chapter.vote') }}</h3>
              <UButton :label="$t('chapter.voteEnd')" color="error" size="xs" variant="soft" @click="endVote" />
            </div>
            <p class="text-sm text-muted">{{ question }}</p>
            <div v-for="(opt, i) in voteOptions" :key="i" class="space-y-1">
              <div class="flex justify-between text-sm">
                <span>{{ opt }}</span>
                <span class="text-muted">{{ voteResults[i] || 0 }}</span>
              </div>
              <div class="h-2 bg-elevated rounded-full overflow-hidden">
                <div class="h-full bg-primary rounded-full transition-all" :style="{ width: barWidth(i) }" />
              </div>
            </div>
            <p class="text-xs text-muted text-right">{{ $t('chapter.voteTotal', { n: voteTotal }) }}</p>
          </template>
        </template>

        <!-- Student：Vote -->
        <template v-else>
          <template v-if="activeVoteId && !voted">
            <h3 class="text-base font-semibold">{{ $t('chapter.vote') }}</h3>
            <p class="text-sm text-muted">{{ voteQuestion }}</p>
            <div class="space-y-2">
              <UButton v-for="(opt, i) in voteOptions" :key="i" :label="opt" variant="outline" size="sm" class="w-full justify-center" @click="submitVote(i)" />
            </div>
          </template>
          <template v-else-if="activeVoteId && voted">
            <h3 class="text-base font-semibold">{{ $t('chapter.vote') }}</h3>
            <p class="text-sm text-muted">{{ voteQuestion }}</p>
            <div v-for="(opt, i) in voteOptions" :key="i" class="space-y-1">
              <div class="flex justify-between text-sm">
                <span>{{ opt }}</span>
                <span class="text-muted">{{ voteResults[i] || 0 }}</span>
              </div>
              <div class="h-2 bg-elevated rounded-full overflow-hidden">
                <div class="h-full bg-primary rounded-full transition-all" :style="{ width: barWidth(i) }" />
              </div>
            </div>
            <p class="text-xs text-muted text-right">{{ $t('chapter.voteTotal', { n: voteTotal }) }}</p>
          </template>
          <template v-else>
            <h3 class="text-base font-semibold">{{ $t('chapter.vote') }}</h3>
            <p class="text-sm text-muted">{{ $t('chapter.voteNoActive') }}</p>
          </template>
        </template>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{ classId: number; canEdit: boolean }>()
const open = defineModel<boolean>('open', { default: false })
const {
  question, options, activeVoteId, voteQuestion, voteOptions, voteResults, voteTotal, voted,
  canStartVote, addOption, removeOption, startVote, submitVote, endVote, barWidth,
} = useChapterVote(props, open)
</script>
