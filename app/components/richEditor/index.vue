<template>
    <div class="relative w-full">
        <UModal v-model:open="isModalOpen" fullscreen scrollable>
            <UButton v-show="false" />
            <template #content>
                <div class="p-6 space-y-4 min-w-[700px]">
                    <h2 class="text-lg font-semibold">富文本编辑</h2>
                    <ueditor v-model="editJson" class="min-h-[300px] border rounded-md" />
                    <div class="flex justify-end gap-2">
                        <UButton variant="soft" @click="() => { isModalOpen = false }">取消</UButton>
                        <UButton color="primary" @click="saveJson">保存</UButton>
                    </div>
                </div>
            </template>
        </UModal>
        <!-- 字符串模式：3行文本域 + 右上角半透明书本按钮 -->
        <div v-if="!isJson" class="relative">
            <UTextarea v-model="model" :rows="3" class="w-full" placeholder="请输入文本内容..." />
            <!-- 富文本编辑弹窗 -->
            <UButton icon="i-heroicons-book-open" variant="ghost" size="sm"
                class="absolute top-0 right-0 opacity-50 hover:opacity-100 transition-opacity z-10"
                aria-label="打开富文本编辑器" @click="openEditor" />
        </div>

        <!-- JSON 模式：渲染富文本（只读） + 右上角半透明输入按钮 -->
        <div v-if="isJson" class="relative border rounded-md p-3 min-h-[72px] cursor-pointer">
            <div @click="openEditor">
                <ueditorRender :json="model" />
            </div>
            <UButton icon="i-heroicons-book-open" variant="ghost" size="sm"
                class="absolute top-0 right-0 opacity-50 hover:opacity-100 transition-opacity z-10" aria-label="切换为文本输入"
                @click="switchToTextMode" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

// v-model 支持 string | Tiptap JSON 对象
const model = defineModel<string | Record<string, any>>({ default: '' })

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

function extractText(node: any): string {
    if (node.text) return node.text
    if (node.content && Array.isArray(node.content)) {
        return node.content.map(extractText).join('')
    }
    return ''
}
</script>