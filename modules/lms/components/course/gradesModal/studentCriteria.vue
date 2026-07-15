<template>
    <!-- Student: pure display of weight ratio and grade criteria (read-only) -->
    <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <!-- Collapse header -->
        <button type="button"
            class="w-full flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            @click="expanded = !expanded">
            <UIcon :name="expanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="size-4 text-gray-500" />
            <UIcon name="i-lucide-sliders-horizontal" class="size-4 text-primary" />
            <span class="text-sm font-semibold text-gray-700 dark:text-gray-200">{{ t('coursePanel.criteria') }}</span>
            <span class="text-xs text-gray-400 truncate hidden sm:inline">{{ t('coursePanel.criteriaHint') }}</span>
        </button>

        <!-- Expanded content (read-only) -->
        <div v-if="expanded" class="p-4 space-y-5">
            <!-- Weight: full score for each item + percentage -->
            <div>
                <div class="flex items-center justify-between mb-2">
                    <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {{ t('coursePanel.weights') }}
                    </h4>
                    <span class="text-xs font-mono text-green-500">
                        {{ t('coursePanel.percentSum') }}: {{ percentSum }}%
                    </span>
                </div>
                <div class="space-y-1">
                    <div v-for="w in effectiveCriteria.weights" :key="w.key"
                        class="flex items-center gap-2 px-1 py-0.5">
                        <span class="text-xs text-gray-600 dark:text-gray-300 flex-1 truncate">
                            {{ t('coursePanel.' + w.key) }}
                        </span>
                        <span class="text-xs text-gray-400 w-20 text-center font-mono">
                            {{ w.maxScore }}
                        </span>
                        <span class="text-xs text-gray-700 dark:text-gray-200 w-16 text-center font-mono font-semibold">
                            {{ w.percent }}%
                        </span>
                    </div>
                </div>
                <p class="text-xs text-gray-400 mt-2">{{ t('coursePanel.weightsHint') }}</p>
            </div>

            <!-- grade threshold -->
            <div>
                <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    {{ t('coursePanel.levels') }}
                </h4>
                <div class="flex flex-wrap gap-2">
                    <div v-for="lvl in sortedLevels" :key="lvl.letter"
                        class="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <span class="text-sm font-bold" :class="gradeLetterClass(lvl.letter)">{{ lvl.letter }}</span>
                        <span class="text-xs text-gray-400">≥</span>
                        <span class="text-xs text-gray-700 dark:text-gray-200 font-mono">{{ lvl.min }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const { effectiveCriteria } = useGradesContext()

const expanded = ref(true)

const percentSum = computed(() =>
    effectiveCriteria.value.weights.reduce((sum: number, w: any) => sum + (Number(w.percent) || 0), 0),
)

const sortedLevels = computed(() =>
    [...effectiveCriteria.value.levels].sort((a: any, b: any) => Number(b.min) - Number(a.min)),
)

function gradeLetterClass(letter: string) {
    switch (letter) {
        case 'A': return 'text-green-600 dark:text-green-300'
        case 'B': return 'text-blue-600 dark:text-blue-300'
        case 'C': return 'text-amber-600 dark:text-amber-300'
        case 'D': return 'text-orange-600 dark:text-orange-300'
        case 'F': return 'text-red-500 dark:text-red-300'
        default: return 'text-gray-400'
    }
}
</script>
