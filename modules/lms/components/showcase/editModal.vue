<template>
    <UModal v-model:open="open" :ui="{ content: 'sm:max-w-2xl' }">
        <template #body>
            <div class="p-6">
                <h3 class="text-lg font-semibold mb-4">{{ id ? $t('showcase.edit') : $t('showcase.create') }}</h3>
                <div class="space-y-4">
                    <!-- 每行一个字段 -->
                    <UFormField :label="$t('showcase.publishTitle')">
                        <UInput v-model="title" :placeholder="$t('showcase.publishTitle')" />
                    </UFormField>

                    <!-- 分类：software / hardware -->
                    <UFormField :label="$t('showcase.publishCategory')">
                        <USelect v-model="category" :items="categoryItems" class="w-full sm:w-64" />
                    </UFormField>

                    <!-- 标签 -->
                    <UFormField :label="$t('showcase.tags')" :hint="$t('showcase.tagsHint')">
                        <div class="flex flex-col gap-2">
                            <div v-if="tags.length" class="flex flex-wrap gap-1.5">
                                <span v-for="(tg, i) in tags" :key="i"
                                    class="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary rounded px-2 py-0.5">
                                    {{ tg }}
                                    <button type="button" @click="tags.splice(i, 1)">
                                        <UIcon name="i-heroicons-x-mark" class="size-3" />
                                    </button>
                                </span>
                            </div>
                            <UInput v-model="tagInput" :placeholder="$t('showcase.tagsPlaceholder')"
                                icon="i-heroicons-tag" @keydown.enter.prevent="addTag"
                                @keydown.comma.prevent="addTag" />
                        </div>
                    </UFormField>

                    <!-- 封面（先裁剪再上传） -->
                    <UFormField :label="$t('showcase.publishCover')">
                        <div class="flex items-center gap-3">
                            <div class="size-24 rounded-lg border border-default bg-elevated overflow-hidden shrink-0">
                                <img v-if="cover" :src="cover" class="w-full h-full object-cover" />
                                <div v-else class="w-full h-full flex items-center justify-center text-muted">
                                    <UIcon name="i-heroicons-photo" class="size-6" />
                                </div>
                            </div>
                            <div class="flex flex-col gap-2">
                                <UButton size="sm" variant="soft" icon="i-heroicons-arrow-up-tray"
                                    @click="coverInput?.click()">{{ $t('common.upload') }}</UButton>
                                <UButton v-if="cover" size="sm" color="error" variant="ghost"
                                    @click="cover = ''">{{ $t('common.delete') }}</UButton>
                                <input ref="coverInput" type="file" accept="image/*" class="hidden"
                                    @change="onCoverFileSelected" />
                            </div>
                        </div>
                    </UFormField>

                    <!-- 富文本内容 -->
                    <UFormField :label="$t('showcase.publishContent')">
                        <richEditor v-model="content" />
                    </UFormField>

                    <!-- 封面裁剪框 -->
                    <FormImageCropperModal ref="cropperRef" :title="$t('showcase.cropCover')"
                        :aspect-ratio="16/10" stencil-type="rectangle" @uploaded="onCropped" />
                </div>
            </div>
        </template>
        <template #footer>
            <div class="flex justify-end gap-2">
                <UButton variant="ghost" @click="open = false">{{ $t('common.cancel') }}</UButton>
                <UButton color="primary" :disabled="!title.trim()" :loading="saving" @click="save">
                    {{ $t('showcase.save') }}
                </UButton>
            </div>
        </template>
    </UModal>
</template>

<script setup>
const props = defineProps({
    id: { type: Number, default: 0 },
})
const emit = defineEmits(['saved'])

const open = defineModel('open', { type: Boolean, default: false })

const { t } = useI18n()
const toast = useToast()

const title = ref('')
const category = ref('software')
const tags = ref([])
const tagInput = ref('')
const cover = ref('')
const content = ref({})
const saving = ref(false)
const coverInput = ref(null)
const cropperRef = ref(null)

const categoryItems = [
    { label: t('showcase.software'), value: 'software' },
    { label: t('showcase.hardware'), value: 'hardware' },
]

function addTag() {
    const parts = tagInput.value
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean)
    for (const v of parts) {
        if (v && !tags.value.includes(v)) tags.value.push(v)
    }
    tagInput.value = ''
}

async function load(id) {
    const d = await cRequest(`/api/showcase/show?id=${id}`)
    if (!d) return
    title.value = d.title || ''
    category.value = d.category === 'hardware' ? 'hardware' : 'software'
    tags.value = Array.isArray(d.tags) ? d.tags : []
    cover.value = d.cover || ''
    content.value = d.content || {}
}

function reset() {
    title.value = ''
    category.value = 'software'
    tags.value = []
    tagInput.value = ''
    cover.value = ''
    content.value = {}
}

watch(open, (val) => {
    if (!val) return
    if (props.id) load(props.id)
    else reset()
})

async function onCoverFileSelected(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type?.startsWith('image/')) {
        toast.add({ title: t('showcase.imageOnly'), color: 'error' })
        return
    }
    cropperRef.value?.setImage(file)
}

function onCropped(url) {
    cover.value = url
}

async function save() {
    const payload = {
        title: title.value.trim(),
        category: category.value === 'hardware' ? 'hardware' : 'software',
        tags: tags.value,
        cover: cover.value || null,
        content: content.value || null,
    }
    saving.value = true
    try {
        if (props.id) {
            await cRequest('/api/showcase/update', { method: 'POST', body: { ...payload, id: props.id } })
        } else {
            await cRequest('/api/showcase', { method: 'POST', body: payload })
        }
        toast.add({ title: t('showcase.savePending'), color: 'success' })
        open.value = false
        emit('saved')
    } catch (e) {
        toast.add({ title: e?.message || 'error', color: 'error' })
    } finally {
        saving.value = false
    }
}
</script>