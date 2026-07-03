<template>
    <UModal v-model:open="isOpen" :ui="{ content: 'max-w-5xl' }" scrollable>
        <template #content>
            <div class="p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold">{{ t('coursePanel.groups') }}</h3>
                    <!-- 教师才显示操作按钮 -->
                    <div v-if="canEdit" class="flex items-center gap-2">
                        <UButton icon="i-lucide-plus" color="primary" variant="outline" size="xs" @click="addGroup"
                            :label="t('coursePanel.addGroup')" />
                        <UButton icon="i-lucide-save" color="primary" size="xs" :loading="saving" @click="saveGroups"
                            :label="t('common.save')" />
                    </div>
                </div>

                <div v-if="loading" class="py-8 text-center text-gray-400">{{ t('common.loading') }}</div>

                <!-- 学生视角：只显示自己所在的组 -->
                <div v-else-if="!canEdit" class="space-y-4 max-w-md mx-auto">
                    <div v-if="myGroupMembers.length > 0">
                        <div class="text-sm font-medium mb-2">{{ myGroupName }}</div>
                        <div class="space-y-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div v-for="s in myGroupMembers" :key="s.userId"
                                class="flex items-center gap-2 p-2 bg-white dark:bg-gray-700 rounded text-sm">
                                <UAvatar :src="s.avatarImg" :alt="s.name" size="2xs" :text="s.name?.charAt(0)" />
                                <span class="flex-1 truncate">{{ s.name }}</span>
                                <UBadge v-if="s._isLeader" color="primary" variant="subtle" size="xs">{{
                                    t('coursePanel.leader') }}</UBadge>
                            </div>
                        </div>
                    </div>
                    <div v-else class="text-center py-6 text-gray-400 text-sm">{{ t('coursePanel.ungrouped') }}</div>
                </div>

                <!-- 教师视角：完整编辑界面 -->
                <div v-else class="flex gap-4">
                    <!-- 未分组学生 -->
                    <div class="w-48 flex-shrink-0">
                        <div class="text-xs font-medium text-gray-400 mb-2">{{ t('coursePanel.ungrouped') }} ({{
                            ungrouped.length }})</div>
                        <div class="space-y-1 min-h-[200px] p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                            @dragover.prevent @drop="onDrop($event, 'ungrouped')">
                            <div v-for="s in ungrouped" :key="s.userId" draggable="true"
                                @dragstart="onDragStart($event, s, null)"
                                class="flex items-center gap-2 p-2 bg-white dark:bg-gray-700 rounded cursor-move text-sm">
                                <UAvatar :src="s.avatarImg" :alt="s.name" size="2xs" :text="s.name?.charAt(0)" />
                                <span class="truncate">{{ s.name }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- 分组列表 -->
                    <div class="flex-1 flex flex-wrap gap-3">
                        <div v-for="(members, groupName) in groupData" :key="groupName" class="w-56 flex-shrink-0"
                            @dragover.prevent="onGroupDragOver($event, groupName)" @drop="onDrop($event, groupName)">
                            <div class="flex items-center justify-between mb-1">
                                <input v-model="groupNames[groupName]"
                                    class="text-sm font-medium bg-transparent border-b border-transparent focus:border-primary-400 outline-none flex-1"
                                    @change="onRename(groupName, $event)" />
                                <UButton icon="i-lucide-x" color="error" variant="ghost" size="2xs"
                                    @click="removeGroup(groupName)" />
                            </div>
                            <div
                                class="space-y-1 min-h-[80px] p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-600">
                                <div
                                    v-for="(s, idx) in members" :key="s.userId" draggable="true"
                                    @dragstart="onDragStart($event, s, groupName)"
                                    @dragover.prevent.stop
                                    @drop="onInnerDrop($event, groupName, idx)"
                                    class="flex items-center gap-2 p-2 bg-white dark:bg-gray-700 rounded cursor-move text-sm"
                                    :class="{ 'ring-2 ring-primary-300': dropTarget === `${groupName}:${idx}` }">
                                    <UAvatar :src="s.avatarImg" :alt="s.name" size="2xs" :text="s.name?.charAt(0)" />
                                    <span class="flex-1 truncate">{{ s.name }}</span>
                                    <UBadge v-if="idx === 0" color="primary" variant="subtle" size="xs">{{
                                        t('coursePanel.leader') }}</UBadge>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </UModal>
</template>

<script setup>
const isOpen = defineModel('open', { default: false })
const { t } = useI18n()
const toast = useToast()
const { students, fetchUsers } = useClassUsers()
const auth = useAuth()

const props = defineProps({
    courseId: { type: [String, Number], default: '' },
    classId: { type: [String, Number], default: '' },
})

// 是否可编辑（教师或管理员）
const canEdit = computed(() => {
    if (auth.hasRole('admin')) return true
    return props.courseId ? auth.isCourseTeacher(Number(props.courseId)) : false
})

// 当前用户所在组（学生视角）
const myGroup = computed(() => {
    const uid = auth.user.value?.id
    for (const [name, members] of Object.entries(groupData.value)) {
        if (members.some(s => s.userId === uid)) {
            return { name, members }
        }
    }
    // 检查未分组
    if (ungrouped.value?.some(s => s.userId === uid)) {
        return null
    }
    return undefined
})

const myGroupName = computed(() => myGroup.value?.name ?? '')
const myGroupMembers = computed(() => myGroup.value?.members ?? [])

const loading = ref(false)
const saving = ref(false)
const ungrouped = ref([])
const groupData = ref({})
const groupNames = ref({})

let dragData = null
const dropTarget = ref(null)

// 将缓存学生转为统一结构
function toStudent(s, isLeader = false, score = 0) {
    return {
        userId: s.id,
        name: s.name,
        avatarImg: s.avatarImg || '',
        score,
        _isLeader: isLeader,
    }
}

// 规范化 group 名称（去掉 c_ 前缀）
function normalizeGroupName(group) {
    if (!group) return ''
    return group.startsWith('c_') ? group.slice(2) : group
}

// 先用缓存学生数据立即显示（全部未分组），再异步合并分组信息
function buildGroups(rawData) {
    const groupMap = new Map((rawData || []).map(r => [r.userId, r]))
    const groups = {}
    const ungrp = []
    // 先收集所有组长（group 带 c_ 前缀），再收普通成员
    const leadersMap = new Map() // groupName -> student

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

    // 组长放首位
    for (const [name, leader] of leadersMap) {
        groups[name].unshift(leader)
    }

    groupData.value = groups
    ungrouped.value = ungrp
    groupNames.value = {}
    for (const key of Object.keys(groupData.value)) {
        groupNames.value[key] = key
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

function onDragStart(e, student, fromGroup) {
    e.dataTransfer.effectAllowed = 'move'
    dragData = { student, fromGroup }
    dropTarget.value = null
}

// 组容器拖拽目标高亮
function onGroupDragOver(e, groupName) {
    // 不做额外操作，由 inner drop 处理
}

// 组外或组间拖放
function onDrop(e, toGroup) {
    e.preventDefault()
    if (!dragData) return
    dropTarget.value = null

    const { student, fromGroup } = dragData

    // 从原位置移除
    if (fromGroup === null) {
        ungrouped.value = ungrouped.value.filter(s => s.userId !== student.userId)
    } else if (fromGroup && groupData.value[fromGroup]) {
        groupData.value[fromGroup] = groupData.value[fromGroup].filter(s => s.userId !== student.userId)
    }

    // 放到新位置
    if (toGroup === 'ungrouped') {
        ungrouped.value.push(student)
    } else if (toGroup !== fromGroup || fromGroup === null) {
        // 跨区域拖拽：追加到末尾
        if (!groupData.value[toGroup]) groupData.value[toGroup] = []
        groupData.value[toGroup].push(student)
    }

    groupData.value = { ...groupData.value }
    ungrouped.value = [...ungrouped.value]
    dragData = null
}

// 组内拖放到指定位置（调整顺序/换组长）
function onInnerDrop(e, groupName, targetIdx) {
    e.preventDefault()
    e.stopPropagation()
    if (!dragData) return
    dropTarget.value = null

    const { student, fromGroup } = dragData

    // 从原位置移除
    let list
    if (fromGroup === null) {
        list = ungrouped.value
    } else {
        list = groupData.value[fromGroup]
    }
    list.splice(list.findIndex(s => s.userId === student.userId), 1)

    // 如果跨组移动，先确保目标组存在
    if (fromGroup !== groupName) {
        if (!groupData.value[groupName]) groupData.value[groupName] = []
    }

    // 插入到目标位置
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

function removeGroup(groupName) {
    if (groupData.value[groupName]) {
        ungrouped.value.push(...groupData.value[groupName])
    }
    delete groupData.value[groupName]
    delete groupNames.value[groupName]
    groupData.value = { ...groupData.value }
    ungrouped.value = [...ungrouped.value]
}

function onRename(oldKey, e) {
    const newName = e.target.value.trim() || oldKey
    if (newName !== oldKey) {
        groupData.value[newName] = groupData.value[oldKey] || []
        groupNames.value[newName] = newName
        delete groupData.value[oldKey]
        delete groupNames.value[oldKey]
        groupData.value = { ...groupData.value }
    }
}

async function saveGroups() {
    saving.value = true
    try {
        const payload = {}
        for (const [key, members] of Object.entries(groupData.value)) {
            payload[key] = members.map(m => ({ userId: m.userId }))
        }
        await cRequest('/api/lms/courses/groups', {
            method: 'POST',
            body: { courseId: Number(props.courseId), groups: payload },
        })
        toast.add({ title: t('coursePanel.saveSuccess'), color: 'success' })
    } catch (e) {
        toast.add({ title: e.message || t('coursePanel.saveFailed'), color: 'error' })
    } finally {
        saving.value = false
    }
}

watch(isOpen, (val) => {
    if (val) loadData()
})
</script>
