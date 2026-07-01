<template>
  <UModal v-model:open="open" :ui="{ content: 'sm:max-w-lg' }" scrollable>
    <template #content>
      <div class="p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold">{{ $t('profile.title') }}</h3>
        </div>

        <div v-if="loading" class="flex items-center justify-center py-10 text-muted">
          <UIcon name="i-lucide-loader-2" class="animate-spin size-5 mr-2" />
          <span class="text-sm">{{ $t('profile.loading') }}</span>
        </div>

        <div v-else class="space-y-4">
          <div class="flex justify-center mb-6">
            <UAvatar :src="form.avatarImg" :alt="form.name" size="2xl" :text="form.name?.charAt(0)" />
          </div>
          <UFormField :label="$t('profile.avatarImg')" class="w-full">
            <UInput v-model="form.avatarImg" :placeholder="$t('profile.avatarImgPlaceholder')" class="w-full" />
          </UFormField>
          <UFormField :label="$t('profile.name')" class="w-full">
            <UInput v-model="form.name" :placeholder="$t('profile.namePlaceholder')" class="w-full" />
          </UFormField>
          <UFormField :label="$t('profile.preferName')" class="w-full">
            <UInput v-model="form.preferName" :placeholder="$t('profile.preferNamePlaceholder')" class="w-full" />
          </UFormField>
          <UFormField :label="$t('profile.englishName')" class="w-full">
            <UInput v-model="form.englishName" :placeholder="$t('profile.englishNamePlaceholder')" class="w-full" />
          </UFormField>
          <UFormField :label="$t('profile.email')" class="w-full">
            <UInput v-model="form.email" type="email" :placeholder="$t('profile.emailPlaceholder')" class="w-full" />
          </UFormField>
          <UFormField :label="$t('profile.gender')" class="w-full">
            <USelect
              v-model="form.gender"
              :items="genderOptions"
              :placeholder="$t('profile.genderPlaceholder')"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="$t('profile.rollNumber')" class="w-full">
            <UInput v-model="form.rollNumber" :placeholder="$t('profile.rollNumberPlaceholder')" class="w-full" />
          </UFormField>
          <UFormField :label="$t('profile.telephone')" class="w-full">
            <UInput v-model="form.telephone" :placeholder="$t('profile.telephonePlaceholder')" class="w-full" />
          </UFormField>
          <UFormField :label="$t('profile.class')" class="w-full">
            <USelect
              v-model="form.classId"
              :items="classOptions"
              :placeholder="$t('profile.classPlaceholder')"
              class="w-full"
            />
          </UFormField>

          <div class="flex justify-end gap-2 pt-4">
            <UButton
              :label="$t('common.cancel')"
              color="neutral"
              variant="ghost"
              @click="closeModal"
            />
            <UButton
              :label="$t('common.save')"
              color="primary"
              :loading="saving"
              @click="saveUser"
            />
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  userId: number | null
}>()

const emit = defineEmits<{
  (e: 'saved'): void
}>()

const { t } = useI18n()
const toast = useToast()

const open = ref(false)
const loading = ref(false)
const saving = ref(false)

const genderOptions = computed(() => [
  { label: t('profile.genderMale'), value: 'male' },
  { label: t('profile.genderFemale'), value: 'female' },
  { label: t('profile.genderOther'), value: 'other' },
])

const form = ref({
  name: '',
  preferName: '',
  englishName: '',
  email: '',
  gender: '',
  avatarImg: '',
  rollNumber: '',
  telephone: '',
  classId: null as number | null,
})

interface ClassItem {
  id: number
  name: string
  code: string
}
const classes = ref<ClassItem[]>([])

const classOptions = computed(() => [
  { label: '', value: null },
  ...classes.value.map((c) => ({ label: c.name, value: c.id })),
])

async function loadClasses() {
  try {
    const data = await cRequest<ClassItem[]>('/api/lms/classes/list')
    classes.value = data || []
  } catch {
    classes.value = []
  }
}

/** 加载目标用户数据 */
async function loadUser() {
  if (!props.userId) return
  loading.value = true
  try {
    const data = await cRequest<any>(`/api/lms/users/show?id=${props.userId}`)
    form.value = {
      name: data?.name || '',
      preferName: data?.preferName || '',
      englishName: data?.englishName || '',
      email: data?.email || '',
      gender: data?.gender || '',
      avatarImg: data?.avatarImg || '',
      rollNumber: data?.rollNumber || '',
      telephone: data?.telephone || '',
      classId: data?.classId ?? null,
    }
  } catch {
    toast.add({ title: t('profile.loadFailed'), color: 'error' })
  } finally {
    loading.value = false
  }
}

function closeModal() {
  open.value = false
}

async function saveUser() {
  if (!props.userId) return
  saving.value = true
  try {
    await cRequest('/api/lms/users/update', {
      method: 'POST',
      body: { id: props.userId, ...form.value },
    })
    toast.add({ title: t('profile.updateSuccess'), color: 'success' })
    emit('saved')
    open.value = false
  } catch (e: any) {
    toast.add({ title: e.message || t('profile.updateFailed'), color: 'error' })
  } finally {
    saving.value = false
  }
}

/** 外部调用：打开弹窗 */
function show() {
  open.value = true
}

watch(open, (val) => {
  if (val && props.userId) {
    loadUser()
    loadClasses()
  }
})

defineExpose({ show })
</script>
