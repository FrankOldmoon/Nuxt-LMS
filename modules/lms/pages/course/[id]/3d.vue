<template>
  <div class="gx">
    <canvas ref="canvasRef" class="gx-canvas" />

    <!-- 顶栏：返回 + 标题 + 统计 + 重置 -->
    <header class="gx-bar">
      <UButton icon="i-lucide-arrow-left" :label="$t('course3d.back')" color="neutral" variant="soft" size="sm"
        @click="goBack" />
      <div class="gx-bar-mid">
        <div class="gx-title">{{ summary.title || $t('course3d.title') }}</div>
        <div class="gx-stats">
          <span>{{ $t('course3d.chaptersCount', { count: totals.chapters }) }}</span>
          <i class="dot" />
          <span>{{ $t('course3d.tagsCount', { count: totals.tags }) }}</span>
          <i class="dot" />
          <span>{{ $t('course3d.contentsCount', { count: totals.contents }) }}</span>
        </div>
      </div>
      <UButton icon="i-lucide-rotate-ccw" color="neutral" variant="soft" size="sm"
        :aria-label="$t('course3d.reset')" :title="$t('course3d.reset')" @click="resetView" />
    </header>

    <!-- 图例 -->
    <div v-if="legend.length" class="gx-legend">
      <div v-for="item in legend" :key="item.key" class="gx-legend-item">
        <i class="swatch" :style="{ background: item.color }" />
        <span>{{ $t('course3d.sources.' + item.key) }}</span>
      </div>
    </div>

    <!-- 加载 / 错误 / 空态 -->
    <div v-if="state === 'loading'" class="gx-center">
      <div class="gx-spinner" />
      <p>{{ $t('course3d.loading') }}</p>
    </div>
    <div v-else-if="state === 'error'" class="gx-center">
      <p class="gx-err">{{ errorMsg || $t('course3d.loadFailed') }}</p>
      <UButton icon="i-lucide-rotate-ccw" :label="$t('course3d.retry')" color="primary" variant="soft" size="sm"
        @click="reload" />
    </div>
    <div v-else-if="empty" class="gx-center">
      <p>{{ $t('course3d.empty') }}</p>
    </div>

    <!-- 悬停提示 -->
    <div v-if="hover && state === 'ready'" class="gx-hover"
      :style="{ left: hover.x + 14 + 'px', top: hover.y + 14 + 'px' }">{{ hover.text }}</div>

    <!-- 点击详情卡 -->
    <transition name="gx-fade">
      <aside v-if="selected" class="gx-card">
        <button class="gx-card-close" :aria-label="$t('common.close')" @click="clearSelection">✕</button>

        <div class="gx-card-kind">{{ $t('course3d.' + selected.kind) }}</div>
        <h2 class="gx-card-title">{{ selected.title || $t('course3d.untitled') }}</h2>

        <!-- 章节 -->
        <template v-if="selected.kind === 'chapter'">
          <div class="gx-badges">
            <UBadge :label="$t(selected.chapterIsPass ? 'course3d.passed' : 'course3d.notPassed')"
              :color="selected.chapterIsPass ? 'success' : 'neutral'" variant="subtle" size="sm" />
            <UBadge :label="$t(selected.chapterIsOpen ? 'course3d.chapterOpen' : 'course3d.chapterLocked')"
              :color="selected.chapterIsOpen ? 'primary' : 'warning'" variant="subtle" size="sm" />
          </div>
          <div class="gx-section-label">{{ $t('course3d.tagsLabel') }}</div>
          <div v-if="selected.tags.length" class="gx-chips">
            <span v-for="tag in selected.tags" :key="tag" class="gx-chip">{{ tag }}</span>
          </div>
          <p v-else class="gx-muted">{{ $t('course3d.noTags') }}</p>
          <UButton class="gx-go" icon="i-lucide-arrow-right" :label="$t('course3d.openChapter')"
            color="primary" size="sm" block @click="openChapter(selected)" />
        </template>

        <!-- 标签 -->
        <template v-else-if="selected.kind === 'tag'">
          <div class="gx-kv">
            <span>{{ $t('course3d.countLabel') }}</span>
            <b>{{ selected.tagCount }}</b>
          </div>
          <div class="gx-section-label">{{ $t('course3d.sourceLabel') }}</div>
          <div class="gx-chips">
            <span v-for="src in selected.tagSources" :key="src" class="gx-chip">
              <i class="swatch" :style="{ background: sourceColor(src) }" />{{ $t('course3d.sources.' + src) }}
            </span>
          </div>
        </template>

        <!-- 核心（课程） -->
        <template v-else>
          <div class="gx-section-label">{{ $t('course3d.tagsLabel') }}</div>
          <div v-if="selected.tags.length" class="gx-chips">
            <span v-for="tag in selected.tags" :key="tag" class="gx-chip">{{ tag }}</span>
          </div>
          <p v-else class="gx-muted">{{ $t('course3d.noTags') }}</p>
          <div class="gx-kv"><span>{{ $t('course3d.chaptersCount', { count: totals.chapters }) }}</span></div>
          <div class="gx-kv"><span>{{ $t('course3d.tagsCount', { count: totals.tags }) }}</span></div>
          <div class="gx-kv"><span>{{ $t('course3d.contentsCount', { count: totals.contents }) }}</span></div>
        </template>
      </aside>
    </transition>

    <div v-if="state === 'ready' && !selected" class="gx-hint">{{ $t('course3d.hint') }}</div>
  </div>
</template>

<script setup lang="ts">
import { GALAXY_SOURCE_COLORS } from '../../../utils/galaxy'

definePageMeta({ layout: false })

const route = useRoute()
const courseId = computed(() => Number(route.params.id) || 0)

const {
  canvasRef, state, errorMsg, summary, totals, legend, selected, hover, empty,
  resetView, clearSelection, reload,
} = useCourseGalaxy(courseId)

function sourceColor(src: string) {
  return GALAXY_SOURCE_COLORS[src] || '#94a3b8'
}

async function goBack() {
  await navigateTo(`/course/${courseId.value}`)
}

async function openChapter(sel: { chapterId?: number }) {
  if (!sel?.chapterId) return
  await navigateTo(`/course/${courseId.value}/${sel.chapterId}`)
}
</script>

<style scoped>
.gx {
  position: fixed;
  inset: 0;
  background: radial-gradient(circle at 50% 42%, #131a33 0%, #070b16 55%, #04060d 100%);
  color: #e6edf7;
  font-family: "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
  overflow: hidden;
}
.gx-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
}

.gx-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(180deg, rgba(4, 7, 14, 0.82), rgba(4, 7, 14, 0));
}
.gx-bar-mid {
  flex: 1;
  min-width: 0;
  text-align: center;
}
.gx-title {
  font-size: 16px;
  font-weight: 700;
  color: #e9d5ff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.gx-stats {
  margin-top: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 12px;
  color: #9fb3d0;
}
.gx-stats .dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #4b5c78;
}

.gx-legend {
  position: absolute;
  left: 16px;
  bottom: 16px;
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  max-width: 46vw;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(9, 13, 24, 0.72);
  border: 1px solid rgba(120, 140, 180, 0.18);
  backdrop-filter: blur(6px);
  font-size: 12px;
  color: #c9d6ea;
}
.gx-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.swatch {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  flex: none;
}

.gx-center {
  position: absolute;
  inset: 0;
  z-index: 12;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: #c9d6ea;
  font-size: 14px;
  text-align: center;
  pointer-events: none;
}
.gx-center :deep(button) { pointer-events: auto; }
.gx-err {
  color: #fca5a5;
  max-width: 70vw;
}
.gx-spinner {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 3px solid rgba(167, 139, 250, 0.25);
  border-top-color: #a78bfa;
  animation: gx-spin 0.9s linear infinite;
}
@keyframes gx-spin { to { transform: rotate(360deg); } }

.gx-hover {
  position: fixed;
  z-index: 14;
  pointer-events: none;
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(9, 13, 24, 0.9);
  border: 1px solid rgba(120, 140, 180, 0.25);
  font-size: 12px;
  color: #e6edf7;
  max-width: 240px;
}

.gx-card {
  position: absolute;
  top: 76px;
  right: 16px;
  z-index: 12;
  width: 300px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  padding: 16px;
  border-radius: 14px;
  background: rgba(11, 16, 29, 0.9);
  border: 1px solid rgba(120, 140, 180, 0.22);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
}
.gx-card-close {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: rgba(120, 140, 180, 0.14);
  color: #c9d6ea;
  cursor: pointer;
  font-size: 12px;
}
.gx-card-kind {
  font-size: 11px;
  letter-spacing: 1px;
  color: #8b9ac0;
  text-transform: uppercase;
}
.gx-card-title {
  margin: 4px 24px 10px 0;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.35;
  color: #f1f5ff;
}
.gx-badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.gx-section-label {
  margin: 12px 0 6px;
  font-size: 12px;
  color: #8b9ac0;
}
.gx-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.gx-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 12px;
  color: #dbe6f7;
  background: rgba(120, 140, 180, 0.14);
  border: 1px solid rgba(120, 140, 180, 0.2);
}
.gx-kv {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 0;
  font-size: 13px;
  color: #c9d6ea;
  border-bottom: 1px solid rgba(120, 140, 180, 0.12);
}
.gx-kv b { color: #e9d5ff; }
.gx-muted { font-size: 12px; color: #7d8da6; }
.gx-go { margin-top: 14px; }

.gx-hint {
  position: absolute;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  z-index: 10;
  font-size: 12px;
  color: #8b9ac0;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(9, 13, 24, 0.6);
  pointer-events: none;
}

.gx-fade-enter-active,
.gx-fade-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.gx-fade-enter-from,
.gx-fade-leave-to { opacity: 0; transform: translateX(8px); }
</style>
