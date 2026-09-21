<template>
    <div class="flex flex-col gap-4">
        <UFormField :label="t('ueditor.modelName')" size="sm">
            <UInput v-model="configName" size="sm" :placeholder="t('ueditor.modelNamePlaceholder')" />
        </UFormField>

        <UFormField :label="t('ueditor.modelFiles')" size="sm">
            <FormInputFile ref="fileInputRef" v-model="fileUrls" multiple accept=".glb,.gltf,.obj,.stl,.babylon" :placeholder="t('ueditor.modelUploadHint')" />
        </UFormField>

        <div v-if="modelList.length" class="border border-default rounded-lg p-3">
            <p class="text-xs text-muted mb-2">{{ t('ueditor.modelList') }}</p>
            <div class="flex flex-col gap-2 max-h-48 overflow-auto">
                <div
                    v-for="(m, idx) in modelList"
                    :key="idx"
                    class="flex flex-col gap-2 p-2 bg-muted/30 rounded"
                >
                    <div class="flex items-center gap-2">
                        <span class="text-xs w-6 text-muted">#{{ idx + 1 }}</span>
                        <input v-model="m.name" class="flex-1 text-sm px-2 py-1 rounded border border-default bg-default" />
                        <div class="flex items-center gap-2">
                            <UIcon name="i-lucide-move-up" class="size-4 cursor-pointer text-muted hover:text-primary" :class="{ 'opacity-30 cursor-not-allowed': idx === 0 }" @click="moveModel(idx, -1)" />
                            <UIcon name="i-lucide-move-down" class="size-4 cursor-pointer text-muted hover:text-primary" :class="{ 'opacity-30 cursor-not-allowed': idx === modelList.length - 1 }" @click="moveModel(idx, 1)" />
                            <UIcon name="i-lucide-trash-2" class="size-4 cursor-pointer text-muted hover:text-error" @click="removeModel(idx)" />
                        </div>
                    </div>

                    <!-- 每个模型的变换：scale / position / rotation（度） -->
                    <div class="flex flex-col gap-1.5">
                        <div class="flex items-center gap-2">
                            <span class="text-xs text-muted w-16 shrink-0 whitespace-nowrap">{{ t('ueditor.modelScale') }}</span>
                            <input v-model.number="m.scale" type="number" step="0.1" min="0" class="w-20 text-xs px-1.5 py-1 rounded border border-default bg-default" />
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-xs text-muted w-16 shrink-0 whitespace-nowrap">{{ t('ueditor.modelPosition') }}</span>
                            <input
                                v-for="(axis, ai) in ['X', 'Y', 'Z']"
                                :key="`pos-${idx}-${ai}`"
                                v-model.number="m.position[ai]"
                                type="number"
                                step="1"
                                :placeholder="axis"
                                class="w-16 text-xs px-1.5 py-1 rounded border border-default bg-default"
                            />
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-xs text-muted w-16 shrink-0 whitespace-nowrap">{{ t('ueditor.modelRotation') }}</span>
                            <input
                                v-for="(axis, ai) in ['X', 'Y', 'Z']"
                                :key="`rot-${idx}-${ai}`"
                                v-model.number="m.rotation[ai]"
                                type="number"
                                step="5"
                                :placeholder="axis"
                                class="w-16 text-xs px-1.5 py-1 rounded border border-default bg-default"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
            <UFormField :label="t('ueditor.modelHeight')" size="sm">
                <UInput v-model.number="configHeight" type="number" size="sm" :placeholder="500" />
            </UFormField>
            <UFormField :label="t('ueditor.modelBg')" size="sm">
                <div class="h-8 w-full rounded border border-default overflow-hidden">
                    <input v-model="configBg" type="color" class="w-full h-full cursor-pointer bg-transparent border-0 p-0" />
                </div>
            </UFormField>
        </div>

        <div class="flex items-center gap-4">
            <label class="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" v-model="configAutoRotate" />
                <span>{{ t('ueditor.modelAutoRotate') }}</span>
            </label>
        </div>

        <UButton size="sm" color="primary" @click="apply">{{ t('common.save') }}</UButton>
    </div>
</template>

<script setup>
const props = defineProps({
    config: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:config', 'close'])
const { t } = useI18n()

const configName = ref(props.config?.name || '')
const fileUrls = ref(props.config?.models?.map((m) => m.url) || [])
const configHeight = ref(props.config?.height || 500)
const configBg = ref(props.config?.bg || '#e0f2fe')
const configAutoRotate = ref(!!props.config?.autoRotate)
const fileInputRef = ref(null)

const modelList = computed({
    get: () => {
        if (Array.isArray(props.config?.models) && props.config.models.length) {
            // 补齐变换字段默认值，保证面板里的 m.scale / m.position[ai] / m.rotation[ai] 可直接编辑
            // （列表项是副本，编辑后由 apply() / applyWithList() 统一 emit 回父级）
            return props.config.models.map((m) => ({
                ...m,
                scale: (Number.isFinite(Number(m?.scale)) && Number(m.scale) !== 0) ? Number(m.scale) : 1,
                position: Array.isArray(m?.position) && m.position.length === 3 ? [...m.position] : [0, 0, 0],
                rotation: Array.isArray(m?.rotation) && m.rotation.length === 3 ? [...m.rotation] : [0, 0, 0],
            }))
        }
        return []
    },
    set: () => {},
})

watch(fileUrls, (urls) => {
    const existing = Array.isArray(props.config?.models) ? [...props.config.models] : []
    const existingUrls = new Set(existing.map((m) => m.url))
    // 从 FormInputFile 的 fileList 获取上传时的本地原始文件名
    const fileList = fileInputRef.value?.fileList || []
    const urlToName = new Map(fileList.map((f) => [f.url, f.name]))
    urls.forEach((url) => {
        if (!existingUrls.has(url)) {
            // 优先用上传时的本地文件名，回退到 URL 提取
            let fname = urlToName.get(url) || ''
            if (!fname) {
                try {
                    const u = new URL(url, window.location.origin)
                    const pathname = u.searchParams.get('pathname') || ''
                    const decoded = decodeURIComponent(pathname)
                    const idx = Math.max(decoded.lastIndexOf('/'), decoded.lastIndexOf('\\'))
                    fname = idx >= 0 ? decoded.slice(idx + 1) : decoded
                } catch (_) {
                    fname = 'model'
                }
            }
            existing.push({ url, name: fname, scale: 1, position: [0, 0, 0], rotation: [0, 0, 0] })
        }
    })
    // 移除被删除的
    const currentSet = new Set(urls)
    const filtered = existing.filter((m) => currentSet.has(m.url))
    emit('update:config', {
        ...props.config,
        models: filtered,
        name: configName.value,
        height: Number(configHeight.value) || 500,
        bg: configBg.value,
        autoRotate: configAutoRotate.value,
    })
}, { deep: true })

function moveModel(idx, dir) {
    const list = modelList.value
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= list.length) return
    const newList = [...list]
    ;[newList[idx], newList[newIdx]] = [newList[newIdx], newList[idx]]
    applyWithList(newList)
}

function removeModel(idx) {
    const newList = modelList.value.filter((_, i) => i !== idx)
    applyWithList(newList)
}

function applyWithList(list) {
    emit('update:config', {
        ...props.config,
        models: list,
        name: configName.value,
        height: Number(configHeight.value) || 500,
        bg: configBg.value,
        autoRotate: configAutoRotate.value,
    })
    fileUrls.value = list.map((m) => m.url)
}

function apply() {
    emit('update:config', {
        ...props.config,
        models: modelList.value,
        name: configName.value,
        height: Number(configHeight.value) || 500,
        bg: configBg.value,
        autoRotate: configAutoRotate.value,
    })
    emit('close')
}
</script>
