import { defineComponent, computed } from 'vue'
import { renderTextWithMarks } from './helpers'

// AllnodePointType → Render Component Map（Importkeep unchanged）
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

export const componentNodeTypes: Record<string, any> = {
  // basic nodePoint
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

  // Table
  table: Table,
  tableRow: TableRow,
  tableCell: TableCell,
  tableHeader: TableHeader,

  // column
  column: Column,
  columnContainer: ColumnContainer,

  // Details
  details: DetailsView,
  detailsSummary: DetailsSummary,
  detailsContent: DetailsContent,

  // Footnote
  footnotes: Footnotes,
  footnote: Footnote,
  footnoteReference: FootnoteReferenceView,

  // mediaBody
  image: ImageView,
  inlineImage: ImageView,
  video: VideoView,
  audio: AudioView,
  file: FileView,
  iframe: IframeView,

  // linesInsideelement
  tag: TagView,
  datetime: DatetimeView,
  mention: MentionView,
  optionBox: OptionBoxView,

  // blockComponent
  toc: TocView,
  codeBlock: CodeBlockView,
  callout: CalloutView,
  textBox: TextBoxView,
  echarts: EchartsView,

  // math formula
  blockMath: MathView,
  inlineMath: MathView,

  vue: VueView,
  inputs: InputsView,
  select: SelectView,
}

// TextnodePointRender Component：encapsulate originalHas renderTextWithMarks logic
export const TextRenderer = defineComponent({
  name: 'TextRenderer',
  props: {
    text: { type: String, default: '' },
    marks: { type: Array, default: () => [] },
  },
  setup(props) {
    return () => renderTextWithMarks(props.text, props.marks)
  },
})

export function useNodeDispatcher(props: any) {
  const currentComponent = computed(() => {
    return componentNodeTypes[props.node.type] || null
  })

  return {
    TextRenderer,
    currentComponent,
  }
}
