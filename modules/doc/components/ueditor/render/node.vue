<template>
  <!-- 文本节点：保留原有 marks 渲染逻辑 -->
  <TextRenderer v-if="node.type === 'text'" :text="node.text" :marks="node.marks" />

  <!-- Doc 根节点：无包裹直接渲染子节点 -->
  <template v-else-if="node.type === 'doc'">
    <RenderNode v-for="(child, index) in node.content" :key="index" :node="child" />
  </template>

  <!-- 匹配到注册类型的节点：动态组件渲染 -->
  <component v-else-if="currentComponent" :is="currentComponent" :node="node" />

  <!-- 未知节点类型：div 包裹降级渲染 -->
  <div v-else>
    <RenderNode v-for="(child, index) in node.content" :key="index" :node="child" />
  </div>
</template>

<script>
import { defineComponent, computed } from 'vue'
import { renderTextWithMarks } from './helpers'

// 所有节点类型 → 渲染组件 映射（导入保持不变）
import Paragraph from '../extensions/nodes/render/paragraph.vue'
import Heading from '../extensions/nodes/render/heading.vue'
import Blockquote from '../extensions/nodes/render/blockquote.vue'
import BulletList from '../extensions/nodes/render/bullet-list.vue'
import OrderedList from '../extensions/nodes/render/ordered-list.vue'
import ListItem from '../extensions/nodes/render/list-item.vue'
import TaskList from '../extensions/nodes/render/task-list.vue'
import TaskItem from '../extensions/nodes/render/task-item.vue'
import HardBreak from '../extensions/nodes/render/hard-break.vue'
import HorizontalRule from '../extensions/nodes/render/horizontal-rule.vue'
import PageBreak from '../extensions/nodes/render/page-break.vue'
import Table from '../extensions/nodes/render/table.vue'
import TableRow from '../extensions/nodes/render/table-row.vue'
import TableCell from '../extensions/nodes/render/table-cell.vue'
import TableHeader from '../extensions/nodes/render/table-header.vue'
import Column from '../extensions/nodes/render/column.vue'
import ColumnContainer from '../extensions/nodes/render/column-container.vue'
import DetailsSummary from '../extensions/nodes/render/details-summary.vue'
import DetailsContent from '../extensions/nodes/render/details-content.vue'
import Footnotes from '../extensions/nodes/render/footnotes.vue'
import Footnote from '../extensions/nodes/render/footnote.vue'

import ImageView from '../extensions/nodes/render/image.vue'
import VideoView from '../extensions/nodes/render/video.vue'
import AudioView from '../extensions/nodes/render/audio.vue'
import FileView from '../extensions/nodes/render/file.vue'
import IframeView from '../extensions/nodes/render/iframe.vue'
import TagView from '../extensions/nodes/render/tag.vue'
import DatetimeView from '../extensions/nodes/render/datetime.vue'
import OptionBoxView from '../extensions/nodes/render/option-box.vue'
import TocView from '../extensions/nodes/render/toc.vue'
import CodeBlockView from '../extensions/nodes/render/code-block.vue'
import CalloutView from '../extensions/nodes/render/callout.vue'
import TextBoxView from '../extensions/nodes/render/text-box.vue'
import MathView from '../extensions/nodes/render/math.vue'
import MentionView from '../extensions/nodes/render/mention.vue'
import FootnoteReferenceView from '../extensions/nodes/render/footnote-reference.vue'
import EchartsView from '../extensions/nodes/render/echarts.vue'
import DetailsView from '../extensions/nodes/render/details.vue'

import VueView from '../extensions/nodes/render/vue/index.vue'
import InputsView from '../extensions/nodes/render/inputs.vue'
import SelectView from '../extensions/nodes/render/select.vue'

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
  },
  computed: {
    currentComponent() {
      return componentNodeTypes[this.node.type] || null
    },
  },
})
</script>