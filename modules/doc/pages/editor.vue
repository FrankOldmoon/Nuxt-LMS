<template>
    <div>
        <div>
            <ueditor v-model="json" />
        </div>
        <div class="p-4">
            <ueditor-render :json="json" />
        </div>
    </div>
</template>

<script setup>
const json = ref({})
</script>

<style></style>