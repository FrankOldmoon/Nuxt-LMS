import { Node, InputRule, PasteRule, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import VueNodeView from './node-view.vue'

// 公共匹配规则
const INPUT_REGEX = /\{\{(.*?)\}\}/

// 公共处理函数
const handleMatch = ({ state, range, match, commands }) => {
  const content = match[1].trim()
  commands.deleteRange(range)
  commands.insertContentAt(range.from, {
    type: 'inputs',
    attrs: { content },
  })
}

export default Node.create({
  name: 'inputs',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return { content: '' }
  },

  parseHTML() {
    return [{ tag: 'span[data-type="inputs"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'inputs' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(VueNodeView)
  },

  addInputRules() {
    return [new InputRule({ find: INPUT_REGEX, handler: handleMatch })]
  },

  addPasteRules() {
    return [new PasteRule({ find: INPUT_REGEX, handler: handleMatch })]
  },
})