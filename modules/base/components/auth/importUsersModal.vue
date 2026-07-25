<template>
    <UModal v-model:open="isOpen" scrollable fullscreen>
        <template #content>
            <div class="flex flex-col" style="height: 75vh;">
                <!-- 标题栏 -->
                <div class="flex items-center justify-between p-4 pb-2">
                    <h3 class="text-lg font-semibold">{{ t('importUsers.title') }}</h3>
                    <div class="flex items-center gap-2">
                        <span v-if="importMsg" class="text-xs" :class="importOk ? 'text-green-500' : 'text-red-500'">
                            {{ importMsg }}
                        </span>
                        <UButton variant="outline" size="sm" :loading="importing" @click="doImport">
                            {{ t('importUsers.import') }}
                        </UButton>
                    </div>
                </div>

                <!-- 提示 -->
                <div class="px-4 pb-2 text-xs text-gray-400">
                    {{ t('importUsers.requiredColumns') }}: username, email, class &nbsp;|&nbsp;
                    {{ t('importUsers.optionalColumns') }}: name, prefer_name, english_name, password ({{ t('importUsers.passwordDefault') }})
                </div>

                <!-- Univer 表格组件 -->
                <sheet
                    ref="sheetRef"
                    :headers="HEADERS"
                    :col-widths="COL_WIDTHS"
                    :active="isOpen"
                    :show-tools="false"
                    :show-footer="false"
                    class="flex-1 min-h-0"
                />
            </div>
        </template>
    </UModal>
</template>

<script setup lang="ts">
const isOpen = defineModel<boolean>('open', { default: false })

const {
    t, sheetRef, importing, importMsg, importOk,
    HEADERS, COL_WIDTHS, doImport,
} = useImportUsers(isOpen)
</script>
