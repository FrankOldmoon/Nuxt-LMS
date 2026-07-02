import { Node, InputRule, PasteRule, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import VueNodeView from './node-view.vue'

// ||answer|| → select 节点
const SELECT_REGEX = /\|\|(.*?)\|\|/

const handleMatch = ({ state, range, match, commands }) => {
  const content = match[1].trim()
  commands.deleteRange(range)
  commands.insertContentAt(range.from, {
    type: 'select',
    attrs: { content },
  })
}

export default Node.create({
  name: 'select',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return { content: '' }
  },

  parseHTML() {
    return [{ tag: 'span[data-type="select"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'select' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(VueNodeView)
  },

  addInputRules() {
    return [new InputRule({ find: SELECT_REGEX, handler: handleMatch })]
  },

  addPasteRules() {
    return [new PasteRule({ find: SELECT_REGEX, handler: handleMatch })]
  },
})
