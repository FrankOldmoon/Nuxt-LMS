<template>
    <div v-if="items.length" class="flex flex-wrap gap-1.5">
        <div v-for="(file, i) in items" :key="i"
            class="flex items-center gap-2 px-2 py-1 rounded-lg bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300">
            <UIcon name="i-heroicons-document" class="w-4 h-4 text-sky-500" />
            <a :href="file.url" target="_blank" class="text-xs hover:underline truncate">{{ file.name }}</a>
        </div>
    </div>
</template>

<script setup>
const props = defineProps({
    files: { type: Array, default: () => [] },
})

const items = useFileNames(() => props.files)
</script>