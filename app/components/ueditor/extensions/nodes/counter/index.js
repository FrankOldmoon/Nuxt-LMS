import { Node, mergeAttributes, InputRule } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import CounterNodeView from './node-view.vue'

export default Node.create({
  name: 'counter',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      content: {
        default: 0,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="counter"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'counter' }),
    ]
  },

  addNodeView() {
    return VueNodeViewRenderer(CounterNodeView)
  },
})