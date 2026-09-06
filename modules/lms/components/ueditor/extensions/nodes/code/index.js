import { Node, InputRule } from '@tiptap/core'

export default Node.create({
    name: 'codes',
    group: 'block',
    addInputRules() {
        return [
            new InputRule({
                find: /^```$/,
                handler: ({ state, range, commands }) => {
                    commands.deleteRange(range)
                    commands.setCodeBlock({language:'python'})
                },
            })
        ]
    },
    addKeyboardShortcuts() {
        return {
            // Cmd/Ctrl+Shift+T：把当前选中块放进 blockquote（再次按下可取消）
            'Mod-Shift-t': () => this.editor.commands.toggleBlockquote(),
        }
    },
})