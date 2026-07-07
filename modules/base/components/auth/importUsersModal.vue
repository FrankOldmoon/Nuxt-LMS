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

<script setup>
const isOpen = defineModel('open', { default: false })

const { t } = useI18n()
const toast = useToast()

const sheetRef = ref(null)
const importing = ref(false)
const importMsg = ref('')
const importOk = ref(true)

// ========== 表头与初始数据 ==========
const HEADERS = ['username', 'email', 'name', 'prefer_name', 'english_name', 'password', 'class']
const COL_WIDTHS = { 0: 110, 1: 180, 2: 100, 3: 110, 4: 120, 5: 120, 6: 100 }

// ========== 读取数据并导入 ==========
async function doImport() {
    importMsg.value = ''
    importOk.value = true

    if (!sheetRef.value) {
        importOk.value = false
        importMsg.value = t('importUsers.notReady')
        return
    }

    const rows = sheetRef.value.getRows()
    if (!rows.length) {
        importOk.value = false
        importMsg.value = t('importUsers.noData')
        return
    }

    const users = rows.map(values => ({
        username: values[0],
        email: values[1],
        name: values[2],
        prefer_name: values[3],
        english_name: values[4],
        password: values[5],
        class: values[6],
    }))

    importing.value = true
    try {
        const resp = await $fetch('/api/users/import', {
            method: 'POST',
            body: { users },
        })
        if (resp.success) {
            importOk.value = true
            importMsg.value = resp.msg
            toast.add({ title: resp.msg, color: 'success' })
            // 重新初始化空表格
            setTimeout(() => sheetRef.value?.reset(), 500)
        } else {
            importOk.value = false
            const errs = resp.data?.errors
            importMsg.value = errs?.length ? errs.slice(0, 5).join('; ') : resp.msg
        }
    } catch (e) {
        importOk.value = false
        importMsg.value = e.message || t('importUsers.importFailed')
    } finally {
        importing.value = false
    }
}

// 弹窗关闭时清空消息
watch(isOpen, (val) => {
    if (!val) importMsg.value = ''
})
</script>
