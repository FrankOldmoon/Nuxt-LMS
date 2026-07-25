import { ref, computed, type Ref } from 'vue'

export function useRichEditor(props: any, model: Ref<string | Record<string, any>>) {
    // 判断当前值是否为 JSON 对象（非数组、非 null、非字符串）
    const isJson = computed(
        () => typeof model.value === 'object' && model.value !== null && !Array.isArray(model.value)
    )

    // 弹窗控制
    const isModalOpen = ref(false)

    // 编辑器内临时 JSON 数据
    const editJson = ref<any>(null)

    /** 打开编辑器：将当前 model 转换为 JSON 赋给 editJson */
    function openEditor() {
        editJson.value = model.value
        isModalOpen.value = true
    }

    /** 保存编辑器内容：写回 model，自动切换至 JSON 渲染视图 */
    function saveJson() {
        model.value = editJson.value || { type: 'doc', content: [] }
        isModalOpen.value = false
    }

    /** 从 JSON 模式切换回纯文本，提取文本写入 model */
    function switchToTextMode() {
        if (isJson.value) {
            const text = jsonToText(model.value as Record<string, any>)
            model.value = text
        }
    }

    // ============== Tiptap JSON 与纯文本互转 ==============
    /** 从 Tiptap JSON 提取纯文本 */
    function jsonToText(doc: Record<string, any>): string {
        if (!doc || !doc.content) return ''
        return extractText(doc)
    }

    return { isJson, isModalOpen, editJson, openEditor, saveJson, switchToTextMode }
}
