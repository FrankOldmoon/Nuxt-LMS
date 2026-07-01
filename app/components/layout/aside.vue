<template>
  <UPageAside>
    <!-- 编辑导航组件（管理员或课程编辑者可见） -->
    <div v-if="hasRole('admin') || isCourseEditor(Number(courseId))">
      <div class="flex items-center gap-1 mb-2">
        <LayoutNavigationEditor mode="course" :course-id="courseId" :navigation="navigation.slice(1)"
          @saved="handleSaved" />
        <LayoutCourseEditor :course-id="Number(courseId)" @saved="handleSaved" />
      </div>
      <div>
        <!-- 选择班级 -->
        <div class="mt-4 space-y-3">
          <UButton :label="selectedClassName || $t('classSelector.selectClass')"
            :icon="selectedClassName ? 'i-lucide-school' : 'i-lucide-plus'" color="info" variant="outline" size="sm"
            class="w-full justify-center" @click="openClassModal" />
        </div>
      </div>
    </div>

    <div v-else />

    <UNavigationMenu :items="navigation" orientation="vertical" :highlight="true" color="primary" class="w-full" />

    <!-- 班级选择弹窗 -->
    <UModal v-model:open="classModalOpen">
      <template #content>
        <div class="p-6 min-w-[400px]">
          <h3 class="text-lg font-semibold mb-4">{{ $t('classSelector.selectClass') }}</h3>

          <UInputMenu v-model="selectedItem" :items="classOptions" value-key="value" label-key="label"
            :placeholder="$t('classSelector.searchPlaceholder')" :loading="classLoading" icon="i-lucide-search"
            class="w-full" @change="onClassChange" v-if="classOptions.length"/>

          <!-- 新增班级 -->
          <div class="flex items-center gap-2 mt-3">
            <UInput v-model="newClassName" :placeholder="$t('classSelector.newClassNamePlaceholder')" class="flex-1" size="sm" @keyup.enter="addClass" />
            <UButton :label="$t('classSelector.addClass')" icon="i-lucide-plus" size="sm" color="primary" variant="soft" :loading="adding" @click="addClass" />
          </div>

          <!-- 班级用户表格 -->
          <div v-if="selectedClassId" class="mt-4">
            <LayoutClassUsersTable :class-id="selectedClassId" />
          </div>

          <div class="flex justify-end gap-2 pt-4 mt-4 border-t border-default">
            <UButton :label="$t('common.cancel')" color="neutral" variant="ghost" size="sm"
              @click="() => { classModalOpen = false }" />
          </div>
        </div>
      </template>
    </UModal>

    <template #bottom>

    </template>
  </UPageAside>
</template>

<script setup lang="ts">

const { hasRole, isCourseEditor, user, refreshUser } = useAuth()
const { navigation, courseId, refresh } = useSidebarNav()
const toast = useToast()
const { t } = useI18n()

// 保存成功后的处理
async function handleSaved() {
  if (refresh) {
    await refresh()
  }
}

// ==================== 班级选择 ====================

interface ClassItem {
  id: number
  name: string
  code: string
}

const classModalOpen = ref(false)
const classList = ref<ClassItem[]>([])
const classLoading = ref(false)
// UInputMenu 绑定的是选中项的 value（classId）
const selectedItem = ref<number | undefined>(undefined)

// 新增班级
const newClassName = ref('')
const adding = ref(false)

const selectedClassId = computed(() => user.value?.defaultClass?.id ?? null)
const selectedClassName = computed(() => user.value?.defaultClass?.name || '')

// UInputMenu 选项：label 显示班级名，value 为班级 id
const classOptions = computed(() =>
  classList.value.map((c) => ({ label: c.name, value: c.id })),
)

async function openClassModal() {
  selectedItem.value = selectedClassId.value ?? undefined
  newClassName.value = ''
  classModalOpen.value = true
  await loadClasses()
}

async function addClass() {
  const name = newClassName.value.trim()
  if (!name) return
  adding.value = true
  try {
    const result = await cRequest<ClassItem[]>('/api/lms/classes/add', {
      method: 'POST',
      body: { name, code: name },
    })
    newClassName.value = ''
    await loadClasses()
    // 默认选中新班级并更新 defaultClass
    const newClass = result?.[0]
    if (newClass) {
      await cRequest('/api/auth/me', {
        method: 'PUT',
        body: { defaultClass: { id: newClass.id, name: newClass.name } },
      })
      await refreshUser()
      selectedItem.value = newClass.id
    }
    toast.add({ title: t('classSelector.addClassSuccess'), color: 'success' })
  } catch (e: any) {
    toast.add({ title: e.message || t('classSelector.addClassFailed'), color: 'error' })
  } finally {
    adding.value = false
  }
}

async function loadClasses() {
  classLoading.value = true
  try {
    const data = await cRequest<ClassItem[]>('/api/lms/classes/list')
    classList.value = data || []
  } catch {
    classList.value = []
  } finally {
    classLoading.value = false
  }
}

async function onClassChange() {
  const classId = selectedItem.value
  if (!classId) return
  const c = classList.value.find((c) => c.id === classId)
  if (!c) return
  try {
    await cRequest('/api/auth/me', {
      method: 'PUT',
      body: { defaultClass: { id: c.id, name: c.name } },
    })
    await refreshUser()
    toast.add({ title: t('classSelector.updateSuccess'), color: 'success' })
  } catch (e: any) {
    toast.add({ title: e.message || t('classSelector.updateFailed'), color: 'error' })
  }
}
</script>
