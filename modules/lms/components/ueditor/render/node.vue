<template>
  <!-- 文本节点：保留原有 marks 渲染逻辑 -->
  <TextRenderer v-if="node.type === 'text'" :text="node.text" :marks="node.marks" />

  <!-- Doc 根节点：无包裹直接渲染子节点 -->
  <template v-else-if="node.type === 'doc'">
    <RenderNode v-for="(child, index) in node.content" :key="index" :node="child" :course-id="courseId" />
  </template>

  <!-- 匹配到注册类型的节点：动态组件渲染 -->
  <component v-else-if="currentComponent" :is="currentComponent" :node="node" :course-id="courseId" />

  <!-- 未知节点类型：div 包裹降级渲染 -->
  <div v-else>
    <RenderNode v-for="(child, index) in node.content" :key="index" :node="child" :course-id="courseId" />
  </div>
</template>

<script>
import { defineComponent, computed, provide, inject } from 'vue'
import { renderTextWithMarks } from './helpers'

// 所有节点类型 → 渲染组件 映射（导入保持不变）
import Paragraph from './nodes/paragraph.vue'
import Heading from './nodes/heading.vue'
import Blockquote from './nodes/blockquote.vue'
import BulletList from './nodes/bullet-list.vue'
import OrderedList from './nodes/ordered-list.vue'
import ListItem from './nodes/list-item.vue'
import TaskList from './nodes/task-list.vue'
import TaskItem from './nodes/task-item.vue'
import HardBreak from './nodes/hard-break.vue'
import HorizontalRule from './nodes/horizontal-rule.vue'
import PageBreak from './nodes/page-break.vue'
import Table from './nodes/table.vue'
import TableRow from './nodes/table-row.vue'
import TableCell from './nodes/table-cell.vue'
import TableHeader from './nodes/table-header.vue'
import Column from './nodes/column.vue'
import ColumnContainer from './nodes/column-container.vue'
import DetailsSummary from './nodes/details-summary.vue'
import DetailsContent from './nodes/details-content.vue'
import Footnotes from './nodes/footnotes.vue'
import Footnote from './nodes/footnote.vue'

import ImageView from './nodes/image.vue'
import VideoView from './nodes/video.vue'
import AudioView from './nodes/audio.vue'
import FileView from './nodes/file.vue'
import IframeView from './nodes/iframe.vue'
import TagView from './nodes/tag.vue'
import DatetimeView from './nodes/datetime.vue'
import OptionBoxView from './nodes/option-box.vue'
import TocView from './nodes/toc.vue'
import CodeBlockView from './nodes/code-block.vue'
import CalloutView from './nodes/callout.vue'
import TextBoxView from './nodes/text-box.vue'
import MathView from './nodes/math.vue'
import MentionView from './nodes/mention.vue'
import FootnoteReferenceView from './nodes/footnote-reference.vue'
import EchartsView from './nodes/echarts.vue'
import DetailsView from './nodes/details.vue'

import VueView from './nodes/vue.vue'
import InputsView from './nodes/inputs.vue'
import SelectView from './nodes/select.vue'

const componentNodeTypes = {
  // 基础节点
  paragraph: Paragraph,
  heading: Heading,
  blockquote: Blockquote,
  bulletList: BulletList,
  orderedList: OrderedList,
  listItem: ListItem,
  taskList: TaskList,
  taskItem: TaskItem,
  hardBreak: HardBreak,
  horizontalRule: HorizontalRule,
  pageBreak: PageBreak,

  // 表格
  table: Table,
  tableRow: TableRow,
  tableCell: TableCell,
  tableHeader: TableHeader,

  // 分栏
  column: Column,
  columnContainer: ColumnContainer,

  // 详情
  details: DetailsView,
  detailsSummary: DetailsSummary,
  detailsContent: DetailsContent,

  // 脚注
  footnotes: Footnotes,
  footnote: Footnote,
  footnoteReference: FootnoteReferenceView,

  // 媒体
  image: ImageView,
  inlineImage: ImageView,
  video: VideoView,
  audio: AudioView,
  file: FileView,
  iframe: IframeView,

  // 行内元素
  tag: TagView,
  datetime: DatetimeView,
  mention: MentionView,
  optionBox: OptionBoxView,

  // 块级组件
  toc: TocView,
  codeBlock: CodeBlockView,
  callout: CalloutView,
  textBox: TextBoxView,
  echarts: EchartsView,

  // 数学公式
  blockMath: MathView,
  inlineMath: MathView,

  vue: VueView,
  inputs: InputsView,
  select: SelectView
}

// 文本节点渲染组件：封装原有 renderTextWithMarks 逻辑
const TextRenderer = defineComponent({
  name: 'TextRenderer',
  props: {
    text: { type: String, default: '' },
    marks: { type: Array, default: () => [] },
  },
  setup(props) {
    return () => renderTextWithMarks(props.text, props.marks)
  },
})

export default defineComponent({
  name: 'RenderNode',
  components: { TextRenderer },
  props: {
    node: { type: Object, required: true },
    courseId: { type: [Number, String], default: undefined },
  },
  computed: {
    currentComponent() {
      return componentNodeTypes[this.node.type] || null
    },
  },
})
</script>