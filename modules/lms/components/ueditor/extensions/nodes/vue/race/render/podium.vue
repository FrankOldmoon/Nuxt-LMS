<template>
    <!-- ====== Podium：前三名（showPodium 时显示） ====== -->
    <div class="mb-4 py-6">
        <h3 class="text-center text-lg font-bold mb-6">{{ raceActive ? t('race.results') : t('race.leaderboard') }}</h3>
        <div class="flex items-end justify-center gap-4">
            <!-- 第2名 -->
            <div v-if="questionTop3[1]" class="flex flex-col items-center" style="margin-bottom: 20px;">
                <UAvatar :src="questionTop3[1].avatarImg" :alt="questionTop3[1].from" size="lg" :text="questionTop3[1].from?.charAt(0)" class="mb-2" />
                <span class="text-sm font-medium mb-1">{{ questionTop3[1].from }}</span>
                <span class="text-xs text-gray-400 mb-2">{{ questionTop3[1].display }}</span>
                <div class="w-20 rounded-t-lg flex items-center justify-center text-white font-bold text-2xl"
                    style="height: 80px; background: linear-gradient(to top, #9ca3af, #d1d5db);">
                    2
                </div>
            </div>
            <!-- 第1名 -->
            <div v-if="questionTop3[0]" class="flex flex-col items-center">
                <UIcon name="i-lucide-crown" class="size-6 text-yellow-400 mb-1" />
                <UAvatar :src="questionTop3[0].avatarImg" :alt="questionTop3[0].from" size="xl" :text="questionTop3[0].from?.charAt(0)" class="mb-2 ring-4 ring-yellow-400" />
                <span class="text-sm font-bold mb-1">{{ questionTop3[0].from }}</span>
                <span class="text-xs text-gray-400 mb-2">{{ questionTop3[0].display }}</span>
                <div class="w-24 rounded-t-lg flex items-center justify-center text-white font-bold text-3xl"
                    style="height: 120px; background: linear-gradient(to top, #f59e0b, #fbbf24);">
                    1
                </div>
            </div>
            <!-- 第3名 -->
            <div v-if="questionTop3[2]" class="flex flex-col items-center" style="margin-bottom: 40px;">
                <UAvatar :src="questionTop3[2].avatarImg" :alt="questionTop3[2].from" size="md" :text="questionTop3[2].from?.charAt(0)" class="mb-2" />
                <span class="text-sm font-medium mb-1">{{ questionTop3[2].from }}</span>
                <span class="text-xs text-gray-400 mb-2">{{ questionTop3[2].display }}</span>
                <div class="w-16 rounded-t-lg flex items-center justify-center text-white font-bold text-xl"
                    style="height: 60px; background: linear-gradient(to top, #b45309, #d97706);">
                    3
                </div>
            </div>
        </div>
        <!-- 无人答对 -->
        <p v-if="!questionTop3.length" class="text-center text-sm text-gray-400 mt-4">{{ t('race.noWinners') }}</p>
    </div>
</template>

<script setup>
import { useRaceRenderContext } from '../useRaceRender'
const { t, raceActive, questionTop3 } = useRaceRenderContext()
</script>
