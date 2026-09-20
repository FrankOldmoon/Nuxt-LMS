<template>
  <TextRenderer v-if="node.type === 'text'" :text="node.text" :marks="node.marks" />
  <template v-else-if="node.type === 'doc'">
    <!-- 全屏播放：按 heading 把内容聚合为一张张「知识卡片」 -->
    <template v-if="cardSections">
      <template v-for="(section, si) in cardSections" :key="'sec' + si">
        <!-- 首个 heading 之前的零散内容（通常为空）：不套卡片，保持原样 -->
        <RenderBlock v-for="b in section.leading" :key="'lead' + b.index" :node="b.node" :index="b.index"
          :course-id="courseId" :track-reading="trackReading" />
        <section v-if="section.heading" class="chapter-play-card">
          <!-- 卡片标题区 -->
          <div class="chapter-play-card__head">
            <RenderBlock :node="section.heading.node" :index="section.heading.index" :course-id="courseId"
              :track-reading="trackReading" />
          </div>
          <!-- 卡片正文区 -->
          <div v-if="section.items.length" class="chapter-play-card__body">
            <RenderBlock v-for="b in section.items" :key="'item' + b.index" :node="b.node" :index="b.index"
              :course-id="courseId" :track-reading="trackReading" />
          </div>
        </section>
      </template>
    </template>

    <!-- 常规渲染：逐块输出 -->
    <template v-else>
      <RenderBlock v-for="(child, index) in node.content" :key="index" :node="child" :index="index"
        :course-id="courseId" :track-reading="trackReading" />
    </template>
  </template>

  <!-- 匹配到注册类型的节点：动态组件渲染（按需透传 blockKeyPrefix / blockKey） -->
  <component v-else-if="currentComponent" :is="currentComponent" v-bind="componentProps" />

  <!-- 未知节点类型：div 包裹降级渲染 -->
  <div v-else>
    <RenderNode v-for="(child, index) in node.content" :key="index" :node="child" :course-id="courseId" />
  </div>
</template>

<script setup>
import { useNodeDispatcher, TextRenderer } from './useNodeDispatcher'
import RenderBlock from './renderBlock.vue'

defineOptions({ name: 'RenderNode' })

const props = defineProps({
  node: { type: Object, required: true },
  courseId: { type: [Number, String], default: undefined },
  // 是否追踪 hover 阅读进度（仅章节主内容区开启，嵌套 ueditorRender 不开启）
  trackReading: { type: Boolean, default: false },
  // 列表节点专用：顶层块 index（字符串），列表组件据此为每个 <li> 生成 blockKey
  blockKeyPrefix: { type: String, default: undefined },
  // 列表项专用：由列表组件传入，list-item/task-item 据此在 <li> 上做 hover 追踪
  blockKey: { type: String, default: undefined },
})

const { currentComponent } = useNodeDispatcher(props)

// 全屏播放状态：用 useState 直接读取（与 useChapterBtns 同 key），
// 避免为每个 RenderNode 实例都注册 watcher / 全屏事件监听
const playFullscreen = useState('chapter-play-fullscreen', () => false)

/**
 * 播放模式下把 doc 的子块按 heading 聚合为「知识卡片」分组：
 * 每个 heading（含其下方直到下一个 heading 的所有内容）构成一张卡片。
 * - 仅在播放模式 + 章节主内容区（trackReading）生效，不影响题目/作业等嵌套渲染
 * - 返回 null 时走常规逐块渲染，未播放时零行为变化
 * - 每块携带原始 index，供 ReadingBlock 生成与 useChapterTask 一致的 blockKey
 */
const cardSections = computed(() => {
  if (props.node.type !== 'doc') return null
  if (!props.trackReading || !playFullscreen.value) return null
  const content = Array.isArray(props.node.content) ? props.node.content : []
  if (!content.length) return null

  const sections = []
  let current = { heading: null, leading: [], items: [] }
  content.forEach((child, index) => {
    if (!child) return
    if (child.type === 'heading') {
      // 前面的分组有内容（有标题或前言块）才收尾，避免产生空分组
      if (current.heading || current.leading.length) sections.push(current)
      current = { heading: { node: child, index }, leading: [], items: [] }
    } else if (current.heading) {
      current.items.push({ node: child, index })
    } else {
      current.leading.push({ node: child, index })
    }
  })
  if (current.heading || current.leading.length) sections.push(current)
  return sections
})

// 仅在显式传入时透传 blockKeyPrefix / blockKey，避免非列表组件的属性穿透
const componentProps = computed(() => {
  const p = { node: props.node, courseId: props.courseId }
  if (props.blockKeyPrefix) p.blockKeyPrefix = props.blockKeyPrefix
  if (props.blockKey) p.blockKey = props.blockKey
  return p
})
</script>
