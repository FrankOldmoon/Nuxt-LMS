<template>
    <div v-if="items.length" class="space-y-1">
        <div v-for="(file, i) in items" :key="i" class="flex items-center gap-2">
            <UIcon name="i-heroicons-document" class="w-4 h-4 text-gray-400" />
            <a :href="file.url" target="_blank" class="text-xs text-blue-500 hover:underline truncate">{{ file.name }}</a>
        </div>
    </div>
</template>

<script setup>
const props = defineProps({
    files: { type: Array, default: () => [] },
})

const items = useFileNames(() => props.files)
</script>