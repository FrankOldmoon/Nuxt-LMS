<template>
  <div v-if="course" class="flex gap-8">
    <!-- 左侧主内容 -->
    <div class="flex-1 min-w-0 max-w-none">
      <!-- 课程头部 -->
      <div class="mb-10 pb-8 border-b border-default">
        <div class="flex items-start gap-4 mb-4">
          <div
            class="flex items-center justify-center size-14 rounded-lg shrink-0"
            :class="colorBgClass(course.color)"
          >
            <UIcon :name="course.icon" class="size-7" :class="colorTextClass(course.color)" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-2">
              <UBadge :label="course.level" :color="levelColor(course.level)" variant="subtle" size="sm" />
              <span class="text-sm text-muted">{{ $t('course.chapters', { count: course.chapters.length }) }}</span>
            </div>
            <h1 class="text-3xl font-bold text-highlighted mb-2">
              {{ course.title }}
            </h1>
          </div>
        </div>

        <!-- 标签 -->
        <div v-if="course.tags?.length" class="flex flex-wrap gap-1.5">
          <UBadge
            v-for="tag in course.tags"
            :key="tag"
            :label="tag"
            color="neutral"
            variant="outline"
            size="sm"
          />
        </div>
      </div>

      <!-- 课程内容 -->
      <UeditorRender :json="course.content" />

      <!-- 章节列表 -->
      <h2 id="chapters" class="text-2xl font-semibold text-highlighted mb-6 mt-12 scroll-mt-20">
        {{ $t('course.chapterList') }}
      </h2>

      <div class="flex flex-col gap-2">
        <template v-for="(item, index) in chapterTree" :key="item.id">
          <!-- 一级章节 -->
          <NuxtLink
            :to="item.accessible === false ? undefined : item.to"
            class="group block"
            :class="item.accessible === false ? 'cursor-not-allowed opacity-60' : ''"
          >
            <UCard
              class="transition-all"
              :class="item.accessible === false ? '' : 'hover:ring-2 hover:ring-primary/30'"
              :ui="{ body: 'flex items-center gap-4' }"
            >
              <div class="flex items-center justify-center size-10 rounded-lg bg-elevated shrink-0 font-bold text-muted">
                {{ String(index + 1).padStart(2, '0') }}
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-base font-medium text-highlighted flex items-center gap-2" :class="item.children?.length ? 'font-bold' : ''">
                  <UIcon v-if="item.accessible === false" name="i-lucide-lock" class="size-4 text-muted" />
                  {{ item.label }}
                </h3>
              </div>
              <UIcon v-if="item.accessible !== false" name="i-lucide-arrow-right" class="size-5 text-muted group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
            </UCard>
          </NuxtLink>

          <!-- 二级章节 -->
          <div v-if="item.children?.length" class="flex flex-col gap-2 pl-6">
            <NuxtLink
              v-for="(child, cIdx) in item.children"
              :key="child.id"
              :to="child.accessible === false ? undefined : child.to"
              class="group block"
              :class="child.accessible === false ? 'cursor-not-allowed opacity-60' : ''"
            >
              <UCard
                class="transition-all"
                :class="child.accessible === false ? '' : 'hover:ring-2 hover:ring-primary/30'"
                :ui="{ body: 'flex items-center gap-3' }"
              >
                <div class="flex items-center justify-center size-8 rounded-lg bg-elevated shrink-0 text-xs font-bold text-muted">
                  {{ index + 1 }}.{{ cIdx + 1 }}
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="text-sm font-medium text-highlighted flex items-center gap-2">
                    <UIcon v-if="child.accessible === false" name="i-lucide-lock" class="size-3.5 text-muted" />
                    {{ child.label }}
                  </h3>
                </div>
                <UIcon v-if="child.accessible !== false" name="i-lucide-arrow-right" class="size-4 text-muted group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />

                <!-- 三级章节 -->
                <template v-if="child.children?.length">
                </template>
              </UCard>
            </NuxtLink>

            <!-- 三级章节（独立行，更深层缩进） -->
            <div v-for="(child, cIdx) in item.children" :key="'sub-'+child.id" class="flex flex-col gap-2 pl-6">
              <NuxtLink
                v-for="(gc, gIdx) in child.children || []"
                :key="gc.id"
                :to="gc.accessible === false ? undefined : gc.to"
                class="group block"
                :class="gc.accessible === false ? 'cursor-not-allowed opacity-50' : ''"
              >
                <div class="flex items-center gap-3 py-1.5 px-3 rounded-lg transition-colors" :class="gc.accessible === false ? '' : 'hover:bg-muted/30'">
                  <span class="text-xs text-muted font-mono shrink-0">{{ index + 1 }}.{{ cIdx + 1 }}.{{ gIdx + 1 }}</span>
                  <span class="text-sm text-highlighted flex items-center gap-1.5">
                    <UIcon v-if="gc.accessible === false" name="i-lucide-lock" class="size-3 text-muted" />
                    {{ gc.label }}
                  </span>
                  <UIcon v-if="gc.accessible !== false" name="i-lucide-arrow-right" class="size-3.5 text-muted ml-auto group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                </div>
              </NuxtLink>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- 右侧目录（桌面端显示，滚动时固定） -->
    <div class="hidden lg:block w-56 shrink-0">
      <div class="sticky top-20">
        <UPageAside>
          <LayoutToc/>
        </UPageAside>
      </div>
    </div>
  </div>

  <!-- 课程不存在 -->
  <div v-else-if="!pending" class="flex flex-col items-center justify-center py-20">
    <UIcon name="i-lucide-search-x" class="size-12 text-muted mb-4" />
    <p class="text-lg text-muted mb-4">{{ $t('course.notFound') }}</p>
    <UButton to="/" :label="$t('course.backToHome')" color="primary" variant="outline" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const courseId = computed(() => route.params.id as string)
const { setToc, setEditableContent, setEditableMeta, contentVersion, courseBtnsConfig, chapterBtnsConfig } = useLayoutState()

const { data: resp, pending, refresh } = cRequest.use<import('#shared/types/lms').LmsCourseDetail | null>(
  () => `/api/lms/courses/show?id=${courseId.value}`,
  { default: () => null },
)

const course = computed(() => resp.value as import('#shared/types/lms').LmsCourseDetail | null)

// 构建章节树：优先使用 orders（与 aside 导航一致），否则用 chapters 默认顺序
interface ChapterNode {
  id: number | string
  label: string
  to?: string
  accessible: boolean
  children?: ChapterNode[]
}

const chapterTree = computed<ChapterNode[]>(() => {
  if (!course.value) return []
  const chapters = course.value.chapters || []
  const orders = course.value.orders || []
  const cid = course.value.id
  const accessMap = new Map(chapters.map(ch => [ch.id, ch.accessible]))

  // 从 orders 构建树
  if (orders.length > 0) {
    const sorted = [...orders].sort((a, b) => a.order - b.order)
    // 构建节点
    function buildNode(o: typeof sorted[number]): ChapterNode {
      const isChapter = o.id && !o.id.startsWith('custom-') && !isNaN(Number(o.id))
      const chId = isChapter ? Number(o.id) : o.id
      const accessible = isChapter ? (accessMap.get(Number(o.id)) ?? true) : true
      return {
        id: chId,
        label: o.label,
        to: isChapter ? `/course/${cid}/${o.id}` : (o.id === 'course' ? `/course/${cid}` : `/course/${cid}#${o.label}`),
        accessible,
      }
    }

    // 构建树：parentId 为 null/undefined 的是根节点
    const rootItems = sorted.filter(o => !o.parentId)
    return rootItems.map(root => {
      const node = buildNode(root)
      const children = sorted.filter(o => o.parentId === root.id)
      if (children.length > 0) {
        node.children = children.map(child => {
          const childNode = buildNode(child)
          const grandchildren = sorted.filter(o => o.parentId === child.id)
          if (grandchildren.length > 0) {
            childNode.children = grandchildren.map(buildNode)
          }
          return childNode
        })
      }
      return node
    })
  }

  // 默认：用 chapters（无层级）
  return chapters.map(ch => ({
    id: ch.id,
    label: ch.title,
    to: `/course/${cid}/${ch.id}`,
    accessible: ch.accessible ?? true,
  }))
})

// 数据变化时设置 TOC + 可编辑内容
watch(resp, (detail) => {
  if (!detail) return
  const content = detail?.content
  if (!content) {
    setToc([{ id: 'chapters', text: '课程章节' }])
  } else {
    setToc([...extractTocFromContent(content), { id: 'chapters', text: '课程章节' }])
  }
  setEditableContent(content ?? null)
  if (detail?.id) setEditableMeta('courses', detail.id, detail.id)
  // 从课程 config.lmsConfig 设置按钮开关
  const lmsCfg = (detail as any)?.config?.lmsConfig || {}
  courseBtnsConfig.value = { showProgress: true, showLeaderboard: true, showGroups: true, showGrades: true, showAnnouncements: true, ...(lmsCfg.courseBtns || {}) }
  chapterBtnsConfig.value = { showPlay: true, showScore: true, showSelect: true, showTimer: true, showInvite: true, showDanmaku: true, showVote: true, showQuickAnswer: true, ...(lmsCfg.chapterBtns || {}) }
}, { immediate: true })

// 监听内容版本号，保存成功后重新获取数据（flush: sync 确保每次变化都触发）
watch(contentVersion, () => refresh(), { flush: 'sync' })
</script>
