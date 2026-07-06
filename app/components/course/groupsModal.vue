<template>
    <UModal v-model:open="isOpen" :ui="{ content: 'max-w-5xl' }" scrollable>
        <template #content>
            <div class="p-6">
                <!-- 标题栏 -->
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold">{{ t('coursePanel.groups') }}</h3>
                    <!-- 教师在成员标签下才显示操作按钮 -->
                    <div v-if="canEdit && activeTab === 'members'" class="flex items-center gap-2">
                        <UButton icon="i-lucide-plus" color="primary" variant="outline" size="xs" @click="addGroup"
                            :label="t('coursePanel.addGroup')" />
                        <UButton icon="i-lucide-save" color="primary" size="xs" :loading="saving" @click="saveGroups"
                            :label="t('common.save')" />
                    </div>
                </div>

                <!-- 标签栏 -->
                <div class="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
                    <button v-for="tab in tabs" :key="tab.value"
                        class="px-3 py-1.5 text-sm font-medium border-b-2 transition-colors"
                        :class="activeTab === tab.value
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
                        @click="activeTab = tab.value">
                        {{ tab.label }}
                    </button>
                </div>

                <!-- 加载中 -->
                <div v-if="loading && activeTab === 'members'" class="py-8 text-center text-gray-400">{{ t('common.loading') }}</div>

                <!-- ========== 成员标签 ========== -->
                <template v-else-if="activeTab === 'members'">
                    <!-- 学生视角：只显示自己所在的组 -->
                    <div v-if="!canEdit" class="space-y-4 max-w-md mx-auto">
                        <div v-if="myGroupMembers.length > 0">
                            <div class="text-sm font-medium mb-2">{{ myGroupName }}</div>
                            <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                    <div v-for="s in myGroupMembers" :key="s.userId" class="relative">
                                        <AuthUserCard :user="getStudentObj(s)" />
                                        <UBadge v-if="s._isLeader" color="primary" variant="subtle" size="xs"
                                            class="absolute top-1 right-1">{{ t('coursePanel.leader') }}</UBadge>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div v-else class="text-center py-6 text-gray-400 text-sm">{{ t('coursePanel.ungrouped') }}</div>
                    </div>

                    <!-- 教师视角：完整编辑界面 -->
                    <div v-else class="flex gap-4">
                        <!-- 未分组学生 -->
                        <div class="w-56 flex-shrink-0">
                            <div class="text-xs font-medium text-gray-400 mb-2">{{ t('coursePanel.ungrouped') }} ({{
                                ungrouped.length }})</div>
                            <div class="min-h-[200px] p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                                @dragover.prevent @drop="onDrop($event, 'ungrouped')">
                                <div class="grid grid-cols-2 gap-1.5">
                                    <div v-for="s in ungrouped" :key="s.userId" draggable="true"
                                        @dragstart="onDragStart($event, s, null)">
                                        <AuthUserCard :user="getStudentObj(s)" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 分组列表 -->
                        <div class="flex-1 flex flex-wrap gap-3">
                            <div v-for="(members, groupName) in groupData" :key="groupName" class="w-64 flex-shrink-0"
                                @dragover.prevent="onGroupDragOver($event, groupName)" @drop="onDrop($event, groupName)">
                                <div class="flex items-center justify-between mb-1">
                                    <input v-model="groupNames[groupName]"
                                        class="text-sm font-medium bg-transparent border-b border-transparent focus:border-primary-400 outline-none flex-1"
                                        @change="onRename(groupName, $event)" />
                                    <UButton icon="i-lucide-x" color="error" variant="ghost" size="2xs"
                                        @click="removeGroup(groupName)" />
                                </div>
                                <div
                                    class="min-h-[80px] p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-600"
                                    :class="{ 'ring-2 ring-primary-300': dropTarget === `${groupName}:inner` }">
                                    <div class="grid grid-cols-2 gap-1.5">
                                        <div
                                            v-for="(s, idx) in members" :key="s.userId" draggable="true"
                                            @dragstart="onDragStart($event, s, groupName)"
                                            @dragover.prevent.stop
                                            @drop="onInnerDrop($event, groupName, idx)"
                                            class="relative"
                                            :class="{ 'ring-2 ring-primary-300 rounded-lg': dropTarget === `${groupName}:${idx}` }">
                                            <AuthUserCard :user="getStudentObj(s)" />
                                            <UBadge v-if="idx === 0" color="primary" variant="subtle" size="xs"
                                                class="absolute top-1 right-1">{{ t('coursePanel.leader') }}</UBadge>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>

                <!-- ========== 聊天标签 ========== -->
                <template v-else-if="activeTab === 'chat'">
                    <!-- 教师：选择小组 -->
                    <div v-if="canEdit" class="mb-3 flex items-center gap-2">
                        <span class="text-sm text-gray-500">{{ t('coursePanel.selectGroup') }}:</span>
                        <USelect v-model="selectedGroupName" :items="groupOptions" size="sm" class="w-48" />
                    </div>
                    <div v-if="activeGroupId" class="h-[500px]">
                        <CourseGroupChat :group-id="activeGroupId" />
                    </div>
                    <div v-else class="text-center py-8 text-gray-400 text-sm">
                        {{ canEdit ? t('coursePanel.noGroups') : t('coursePanel.ungrouped') }}
                    </div>
                </template>

                <!-- ========== 文件标签 ========== -->
                <template v-else-if="activeTab === 'files'">
                    <!-- 教师：选择小组 -->
                    <div v-if="canEdit" class="mb-3 flex items-center gap-2">
                        <span class="text-sm text-gray-500">{{ t('coursePanel.selectGroup') }}:</span>
                        <USelect v-model="selectedGroupName" :items="groupOptions" size="sm" class="w-48" />
                    </div>
                    <div v-if="activeGroupId" class="h-[500px]">
                        <FilesMyFilesModal :group="activeGroupId" inline />
                    </div>
                    <div v-else class="text-center py-8 text-gray-400 text-sm">
                        {{ canEdit ? t('coursePanel.noGroups') : t('coursePanel.ungrouped') }}
                    </div>
                </template>
            </div>
        </template>
    </UModal>
</template>

<script setup lang="ts">
const isOpen = defineModel<boolean>('open', { default: false })
const { t } = useI18n()
const toast = useToast()
const { students, fetchUsers } = useClassUsers()
const auth = useAuth()

const props = defineProps<{
    courseId?: string | number
    classId?: string | number
}>()

// 是否可编辑（教师或管理员）
const canEdit = computed(() => {
    if (auth.hasRole('admin')) return true
    return props.courseId ? auth.isCourseTeacher(Number(props.courseId)) : false
})

// 标签页
const activeTab = ref<'members' | 'chat' | 'files'>('members')
const tabs = computed(() => [
    { label: t('coursePanel.members'), value: 'members' as const },
    { label: t('coursePanel.groupChat'), value: 'chat' as const },
    { label: t('coursePanel.groupFiles'), value: 'files' as const },
])

// 当前用户所在组（学生视角）
const myGroup = computed(() => {
    const uid = auth.user.value?.id
    for (const [name, members] of Object.entries(groupData.value)) {
        if (members.some((s: any) => s.userId === uid)) {
            return { name, members }
        }
    }
    if (ungrouped.value?.some((s: any) => s.userId === uid)) {
        return null
    }
    return undefined
})

const myGroupName = computed(() => myGroup.value?.name ?? '')
const myGroupMembers = computed(() => myGroup.value?.members ?? [])

// 教师选择的小组
const selectedGroupName = ref('')
const groupOptions = computed(() =>
    Object.keys(groupData.value).map(name => ({ label: name, value: name }))
)

// 当前激活的小组 ID（教师用 selectedGroupName，学生用 myGroupName）
const activeGroupId = computed(() => {
    const name = canEdit.value ? selectedGroupName.value : myGroupName.value
    if (!name || !props.courseId) return ''
    return `${props.courseId}_${name}`
})

const loading = ref(false)
const saving = ref(false)
const ungrouped = ref<any[]>([])
const groupData = ref<Record<string, any[]>>({})
const groupNames = ref<Record<string, string>>({})

let dragData: any = null
const dropTarget = ref<string | null>(null)

// 从全局缓存查找完整学生信息，供 AuthUserCard 使用
const studentMap = computed(() => new Map(students.value.map(s => [s.id, s])))
function getStudentObj(s: any) {
    return studentMap.value.get(s.userId) || { id: s.userId, name: s.name, avatarImg: s.avatarImg }
}

// 将缓存学生转为统一结构
function toStudent(s: any, isLeader = false, score = 0) {
    return {
        userId: s.id,
        name: s.name,
        avatarImg: s.avatarImg || '',
        score,
        _isLeader: isLeader,
    }
}

// 规范化 group 名称（去掉 c_ 前缀）
function normalizeGroupName(group: string) {
    if (!group) return ''
    return group.startsWith('c_') ? group.slice(2) : group
}

// 先用缓存学生数据立即显示（全部未分组），再异步合并分组信息
function buildGroups(rawData: any) {
    const groupMap = new Map((rawData || []).map((r: any) => [r.userId, r]))
    const groups: Record<string, any[]> = {}
    const ungrp: any[] = []
    const leadersMap = new Map<string, any>()

    for (const s of students.value) {
        const g = groupMap.get(s.id)
        const rawGroup = g?.group || ''
        const normalizedName = normalizeGroupName(rawGroup)
        const isLeader = rawGroup.startsWith('c_')

        if (!normalizedName) {
            ungrp.push(toStudent(s))
            continue
        }

        const stu = toStudent(s, isLeader, g?.score ?? 0)

        if (!groups[normalizedName]) {
            groups[normalizedName] = []
        }

        if (isLeader) {
            leadersMap.set(normalizedName, stu)
        } else {
            groups[normalizedName].push(stu)
        }
    }

    for (const [name, leader] of leadersMap) {
        groups[name].unshift(leader)
    }

    groupData.value = groups
    ungrouped.value = ungrp
    groupNames.value = {}
    for (const key of Object.keys(groupData.value)) {
        groupNames.value[key] = key
    }

    // 教师默认选中第一个小组
    const keys = Object.keys(groups)
    if (keys.length && !selectedGroupName.value) {
        selectedGroupName.value = keys[0]
    }
}

async function loadData() {
    if (!props.courseId) return
    buildGroups([])
    loading.value = true
    try {
        if (props.classId) {
            await fetchUsers(Number(props.classId), Number(props.courseId))
            buildGroups([])
        }
        const params = new URLSearchParams({ courseId: String(props.courseId) })
        if (props.classId) params.set('classId', String(props.classId))
        const data = await cRequest(`/api/lms/courses/groups?${params}`)
        buildGroups(data)
    } catch (e) {
        console.error('加载分组失败', e)
    } finally {
        loading.value = false
    }
}

function onDragStart(e: DragEvent, student: any, fromGroup: string | null) {
    e.dataTransfer!.effectAllowed = 'move'
    dragData = { student, fromGroup }
    dropTarget.value = null
}

function onGroupDragOver(_e: DragEvent, _groupName: string) {
    // 不做额外操作，由 inner drop 处理
}

function onDrop(e: DragEvent, toGroup: string) {
    e.preventDefault()
    if (!dragData) return
    dropTarget.value = null

    const { student, fromGroup } = dragData

    if (fromGroup === null) {
        ungrouped.value = ungrouped.value.filter(s => s.userId !== student.userId)
    } else if (fromGroup && groupData.value[fromGroup]) {
        groupData.value[fromGroup] = groupData.value[fromGroup].filter(s => s.userId !== student.userId)
    }

    if (toGroup === 'ungrouped') {
        ungrouped.value.push(student)
    } else if (toGroup !== fromGroup || fromGroup === null) {
        if (!groupData.value[toGroup]) groupData.value[toGroup] = []
        groupData.value[toGroup].push(student)
    }

    groupData.value = { ...groupData.value }
    ungrouped.value = [...ungrouped.value]
    dragData = null
}

function onInnerDrop(e: DragEvent, groupName: string, targetIdx: number) {
    e.preventDefault()
    e.stopPropagation()
    if (!dragData) return
    dropTarget.value = null

    const { student, fromGroup } = dragData

    let list: any[]
    if (fromGroup === null) {
        list = ungrouped.value
    } else {
        list = groupData.value[fromGroup]
    }
    list.splice(list.findIndex(s => s.userId === student.userId), 1)

    if (fromGroup !== groupName) {
        if (!groupData.value[groupName]) groupData.value[groupName] = []
    }

    const targetList = groupData.value[groupName]
    targetList.splice(targetIdx, 0, student)

    groupData.value = { ...groupData.value }
    ungrouped.value = [...ungrouped.value]
    dragData = null
}

function addGroup() {
    const name = `group_${Date.now()}`
    groupData.value[name] = []
    groupNames.value[name] = name
    groupData.value = { ...groupData.value }
}

function removeGroup(groupName: string) {
    if (groupData.value[groupName]) {
        ungrouped.value.push(...groupData.value[groupName])
    }
    delete groupData.value[groupName]
    delete groupNames.value[groupName]
    groupData.value = { ...groupData.value }
    ungrouped.value = [...ungrouped.value]
    // 如果删除的是当前选中的小组，切换到第一个
    if (selectedGroupName.value === groupName) {
        const keys = Object.keys(groupData.value)
        selectedGroupName.value = keys[0] || ''
    }
}

function onRename(oldKey: string, e: Event) {
    const newName = (e.target as HTMLInputElement).value.trim() || oldKey
    if (newName !== oldKey) {
        groupData.value[newName] = groupData.value[oldKey] || []
        groupNames.value[newName] = newName
        delete groupData.value[oldKey]
        delete groupNames.value[oldKey]
        groupData.value = { ...groupData.value }
        if (selectedGroupName.value === oldKey) {
            selectedGroupName.value = newName
        }
    }
}

async function saveGroups() {
    saving.value = true
    try {
        const payload: Record<string, any[]> = {}
        for (const [key, members] of Object.entries(groupData.value)) {
            payload[key] = members.map(m => ({ userId: m.userId }))
        }
        await cRequest('/api/lms/courses/groups', {
            method: 'POST',
            body: { courseId: Number(props.courseId), groups: payload },
        })
        toast.add({ title: t('coursePanel.saveSuccess'), color: 'success' })
    } catch (e: any) {
        toast.add({ title: e.message || t('coursePanel.saveFailed'), color: 'error' })
    } finally {
        saving.value = false
    }
}

watch(isOpen, (val) => {
    if (val) {
        activeTab.value = 'members'
        selectedGroupName.value = ''
        loadData()
    }
})
</script>
