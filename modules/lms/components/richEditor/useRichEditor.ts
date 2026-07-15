import { ref, computed, type Ref } from 'vue'

export function useRichEditor(props: any, model: Ref<string | Record<string, any>>) {
    // Check whether the current value is a JSON object (not an array, not null, not a string)
    const isJson = computed(
        () => typeof model.value === 'object' && model.value !== null && !Array.isArray(model.value)
    )

    // Modal control
    const isModalOpen = ref(false)

    // Temporary JSON data inside the editor
    const editJson = ref<any>(null)

    /** Open the editor: convert the current model to JSON and assign it to editJson */
    function openEditor() {
        editJson.value = model.value
        isModalOpen.value = true
    }

    /** Save editor content: write back to model, automatically switch to the JSON render view */
    function saveJson() {
        model.value = editJson.value || { type: 'doc', content: [] }
        isModalOpen.value = false
    }

    /** Switch from JSON mode back to plain text, extract the text and write it into model */
    function switchToTextMode() {
        if (isJson.value) {
            const text = jsonToText(model.value as Record<string, any>)
            model.value = text
        }
    }

    // ============== Tiptap JSON <-> Plain Text conversion ==============
    /** Extract plain text from Tiptap JSON */
    function jsonToText(doc: Record<string, any>): string {
        if (!doc || !doc.content) return ''
        return extractText(doc)
    }

    return { isJson, isModalOpen, editJson, openEditor, saveJson, switchToTextMode }
}
