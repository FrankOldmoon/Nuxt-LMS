<template>
  <UCard v-if="user" :ui="{ body: 'p-3 sm:p-4', root: 'rounded-lg' }">
    <!-- 用户基本信息：头像 / 姓名 / 学号 -->
    <div class="flex items-center gap-3">
      <UAvatar
        :src="user.avatarImg || undefined"
        :alt="user.name"
        :text="user.name?.charAt(0)"
        size="xl"
      />
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-highlighted truncate">
          {{ user.name || user.preferName }}
        </div>
        <div v-if="user.username" class="text-xs text-muted truncate font-mono mt-0.5">
          {{ user.username }}
        </div>
        <!-- 已获得的奖章 -->
        <div v-if="myMedals.length" class="flex flex-wrap gap-1 mt-1">
          <UTooltip v-for="medal in myMedals" :key="medal.medalId"
            :text="`${medal.name}：${medal.content?.description || ''}`">
            <UIcon :name="medal.content?.icon || 'i-lucide-award'"
              :class="medalIconColor(medal.content?.color)" class="size-4" />
          </UTooltip>
        </div>
      </div>
    </div>

    <!-- 等级 + 经验（仅在课程上下文中显示） -->
    <div v-if="hasCourse" class="mt-3 pt-3 border-t border-default">
      <div class="flex items-center justify-between mb-1.5">
        <div class="flex items-center gap-1.5">
          <UIcon name="i-lucide-sparkles" class="size-3.5 text-primary" />
          <span class="text-xs font-semibold text-highlighted">Lv.{{ levelInfo.level }}</span>
        </div>
        <span class="text-xs text-muted font-mono">
          EXP {{ levelInfo.current }} / {{ levelInfo.next }}
        </span>
      </div>
      <div class="w-full h-1.5 bg-elevated rounded overflow-hidden">
        <div
          class="h-full bg-primary transition-all duration-500"
          :style="{ width: `${levelInfo.percent}%` }"
        />
      </div>
    </div>

    <!-- 积分信息 -->
    <div v-if="hasCourse" class="mt-3 pt-3 border-t border-default space-y-1.5 text-sm">
      <div class="flex items-center justify-between">
        <span class="flex items-center gap-1.5 text-muted">
          <UIcon name="i-lucide-trophy" class="size-3.5 text-blue-500"/>
          {{ $t('userCard.courseScore') }}
        </span>
        <span class="font-mono font-medium text-highlighted">
          {{ courseScoreDisplay }}
        </span>
      </div>
      <div class="flex items-center justify-between">
        <span class="flex items-center gap-1.5 text-muted">
          <UIcon name="i-lucide-coins" class="size-3.5 text-yellow-500" />
          {{ $t('userCard.coin') }}
        </span>
        <span class="font-mono font-medium text-highlighted">
          {{ coinDisplay }}
        </span>
      </div>
      <div v-if="hasChapter" class="flex items-center justify-between">
        <span class="flex items-center gap-1.5 text-muted">
          <UIcon name="i-lucide-book-open" class="size-3.5 text-green-500" />
          {{ $t('userCard.chapterScore') }}
        </span>
        <span class="font-mono font-medium text-highlighted">
          {{ chapterScoreDisplay }}
        </span>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { useUserCardSetup } from './useUserCard'

const {
  user, myMedals, medalIconColor, hasCourse, levelInfo, hasChapter,
  courseScoreDisplay, coinDisplay, chapterScoreDisplay, refresh,
} = useUserCardSetup()

defineExpose({ refresh })
</script>
