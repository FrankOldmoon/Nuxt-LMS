<template>
    <!-- Inline mode: render content directly, no modal -->
    <div v-if="inline" class="flex flex-col h-full">
        <FilesMyFilesInner
            :group="group"
            :picker="picker && !group"
            :multiple="multiple"
            :open="true"
            @confirm="onConfirm"
        />
    </div>
    <!-- Modal mode -->
    <UModal v-else v-model:open="isOpen" :ui="{ content: 'max-w-4xl' }" scrollable>
        <template #content>
            <div class="flex flex-col" style="height: 80vh;">
                <FilesMyFilesInner
                    :group="group"
                    :picker="picker && !group"
                    :multiple="multiple"
                    :open="isOpen"
                    @confirm="onConfirm"
                />
            </div>
        </template>
    </UModal>
</template>

<script setup lang="ts">
const isOpen = defineModel<boolean>('open', { default: false })

const props = defineProps<{
    picker?: boolean
    multiple?: boolean
    group?: string
    inline?: boolean
}>()

const emit = defineEmits<{
    confirm: [files: any[]]
}>()

function onConfirm(files: any[]) {
    emit('confirm', files)
    if (!props.inline) isOpen.value = false
}
</script>
