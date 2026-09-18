<template>
    <!-- ====== Podium：前三名（showPodium 时显示；默认收起，点击标题展开） ====== -->
    <div class="mb-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <button type="button"
            class="w-full flex items-center gap-2 px-3 py-2 text-left text-base font-bold text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            :aria-expanded="open" @click="open = !open">
            <UIcon name="i-lucide-trophy" class="size-4 text-yellow-500 shrink-0" />
            <span>{{ raceActive ? t('race.results') : t('race.leaderboard') }}</span>
            <UIcon :name="open ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                class="size-4 ml-auto text-gray-400 shrink-0" />
        </button>
        <div v-show="open" class="race-podium-body py-6 border-t border-gray-100 dark:border-gray-800">
            <div class="flex items-end justify-center gap-4">
                <!-- 第2名 -->
                <div v-if="questionTop3[1]" class="flex flex-col items-center" style="margin-bottom: 20px;">
                    <AvatarWithFrame :src="questionTop3[1].avatarImg" :alt="questionTop3[1].from" size="lg" :text="questionTop3[1].from?.charAt(0)" class="mb-2" :frame="questionTop3[1].avatarFrame || null" :userId="questionTop3[1].userId" />
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
                    <div class="mb-2 rounded-full ring-4 ring-yellow-400">
                        <AvatarWithFrame :src="questionTop3[0].avatarImg" :alt="questionTop3[0].from" size="xl" :text="questionTop3[0].from?.charAt(0)" :frame="questionTop3[0].avatarFrame || null" :userId="questionTop3[0].userId" />
                    </div>
                    <span class="text-sm font-bold mb-1">{{ questionTop3[0].from }}</span>
                    <span class="text-xs text-gray-400 mb-2">{{ questionTop3[0].display }}</span>
                    <div class="w-24 rounded-t-lg flex items-center justify-center text-white font-bold text-3xl"
                        style="height: 120px; background: linear-gradient(to top, #f59e0b, #fbbf24);">
                        1
                    </div>
                </div>
                <!-- 第3名 -->
                <div v-if="questionTop3[2]" class="flex flex-col items-center" style="margin-bottom: 40px;">
                    <AvatarWithFrame :src="questionTop3[2].avatarImg" :alt="questionTop3[2].from" size="md" :text="questionTop3[2].from?.charAt(0)" class="mb-2" :frame="questionTop3[2].avatarFrame || null" :userId="questionTop3[2].userId" />
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
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRaceRenderContext } from '../useRaceRender'
const { t, raceActive, questionTop3 } = useRaceRenderContext()

// 排行（领奖台）默认收起，点击标题展开/收起
const open = ref(false)
</script>
