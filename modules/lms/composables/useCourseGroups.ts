import { provide, inject, type InjectionKey, type Ref } from 'vue'

interface GroupsModalProps {
  courseId?: string | number
  classId?: string | number
}

type CourseGroupsCtx = ReturnType<typeof useCourseGroups>

const CourseGroupsKey: InjectionKey<CourseGroupsCtx> = Symbol('CourseGroups')

/** Course grouping modal: member drag-and-drop grouping + chat/file tabs */
export function useCourseGroups(props: GroupsModalProps, isOpen: Ref<boolean>) {
  const { t } = useI18n()
  const toast = useToast()
  const { students, fetchUsers } = useClassUsers()
  const { hasRole, user } = useAuth()
  const { isCourseTeacher } = useAuthLms()

  const canEdit = computed(() => {
    if (hasRole('admin')) return true
    return props.courseId ? isCourseTeacher(Number(props.courseId)) : false
  })

  const activeTab = ref<'members' | 'chat' | 'files'>('members')
  const tabs = computed(() => [
    { label: t('coursePanel.members'), value: 'members' as const },
    { label: t('coursePanel.groupChat'), value: 'chat' as const },
    { label: t('coursePanel.groupFiles'), value: 'files' as const },
  ])

  const loading = ref(false)
  const saving = ref(false)
  const ungrouped = ref<any[]>([])
  const groupData = ref<Record<string, any[]>>({})
  const groupNames = ref<Record<string, string>>({})
  let dragData: any = null
  const dropTarget = ref<string | null>(null)
  const selectedGroupName = ref('')

  const myGroup = computed(() => {
    const uid = user.value?.id
    for (const [name, members] of Object.entries(groupData.value)) {
      if (members.some((s: any) => s.userId === uid)) return { name, members }
    }
    if (ungrouped.value?.some((s: any) => s.userId === uid)) return null
    return undefined
  })
  const myGroupName = computed(() => myGroup.value?.name ?? '')
  const myGroupMembers = computed(() => myGroup.value?.members ?? [])
  const groupOptions = computed(() => Object.keys(groupData.value).map(name => ({ label: name, value: name })))
  const activeGroupId = computed(() => {
    const name = canEdit.value ? selectedGroupName.value : myGroupName.value
    if (!name || !props.courseId) return ''
    return `${props.courseId}_${name}`
  })
  const studentMap = computed(() => new Map(students.value.map(s => [s.id, s])))

  function getStudentObj(s: any) {
    return studentMap.value.get(s.userId) || { id: s.userId, name: s.name, avatarImg: s.avatarImg }
  }

  function toStudent(s: any, isLeader = false, score = 0) {
    return { userId: s.id, name: s.name, avatarImg: s.avatarImg || '', score, _isLeader: isLeader }
  }

  function normalizeGroupName(group: string) {
    if (!group) return ''
    return group.startsWith('c_') ? group.slice(2) : group
  }

  function buildGroups(rawData: any) {
    const groupMap: Map<number, any> = new Map()
    for (const r of (rawData || [])) { groupMap.set(r.userId, r) }
    const groups: Record<string, any[]> = {}
    const ungrp: any[] = []
    const leadersMap = new Map<string, any>()
    for (const s of students.value) {
      const g = groupMap.get(s.id)
      const rawGroup = g?.group || ''
      const normalizedName = normalizeGroupName(rawGroup)
      const isLeader = rawGroup.startsWith('c_')
      if (!normalizedName) { ungrp.push(toStudent(s)); continue }
      const stu = toStudent(s, isLeader, g?.score ?? 0)
      if (!groups[normalizedName]) groups[normalizedName] = []
      if (isLeader) { leadersMap.set(normalizedName, stu) } else { groups[normalizedName]!.push(stu) }
    }
    for (const [name, leader] of leadersMap) { groups[name]?.unshift(leader) }
    groupData.value = groups
    ungrouped.value = ungrp
    groupNames.value = {}
    for (const key of Object.keys(groupData.value)) { groupNames.value[key] = key }
    const keys = Object.keys(groups)
    if (keys.length && !selectedGroupName.value) { selectedGroupName.value = keys[0]! }
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
      const data = await cRequest(`/api/courses/groups?${params}`)
      buildGroups(data)
    } catch (e) {
      console.error('Failed to load groups', e)
    } finally {
      loading.value = false
    }
  }

  function onDragStart(e: DragEvent, student: any, fromGroup: string | null) {
    e.dataTransfer!.effectAllowed = 'move'
    dragData = { student, fromGroup }
    dropTarget.value = null
  }

  function onGroupDragOver(_e: DragEvent, _groupName: string) {}

  function onDrop(e: DragEvent, toGroup: string) {
    e.preventDefault()
    if (!dragData) return
    dropTarget.value = null
    const { student, fromGroup } = dragData
    if (fromGroup === null) {
      ungrouped.value = ungrouped.value.filter(s => s.userId !== student.userId)
    } else if (fromGroup && groupData.value[fromGroup]) {
      groupData.value[fromGroup] = groupData.value[fromGroup]!.filter(s => s.userId !== student.userId)
    }
    if (toGroup === 'ungrouped') {
      ungrouped.value.push(student)
    } else if (toGroup !== fromGroup || fromGroup === null) {
      if (!groupData.value[toGroup]) groupData.value[toGroup] = []
      groupData.value[toGroup]!.push(student)
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
    const list = fromGroup === null ? ungrouped.value : (groupData.value[fromGroup] || [])
    list.splice(list.findIndex(s => s.userId === student.userId), 1)
    if (fromGroup !== groupName && !groupData.value[groupName]) groupData.value[groupName] = []
    groupData.value[groupName]!.splice(targetIdx, 0, student)
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
    if (groupData.value[groupName]) ungrouped.value.push(...groupData.value[groupName]!)
    delete groupData.value[groupName]
    delete groupNames.value[groupName]
    groupData.value = { ...groupData.value }
    ungrouped.value = [...ungrouped.value]
    if (selectedGroupName.value === groupName) {
      selectedGroupName.value = Object.keys(groupData.value)[0] || ''
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
      if (selectedGroupName.value === oldKey) selectedGroupName.value = newName
    }
  }

  async function saveGroups() {
    saving.value = true
    try {
      const payload: Record<string, any[]> = {}
      for (const [key, members] of Object.entries(groupData.value)) {
        payload[key] = members.map(m => ({ userId: m.userId }))
      }
      await cRequest('/api/courses/groups', {
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

  const ctx = {
    canEdit, activeTab, tabs, loading, saving,
    ungrouped, groupData, groupNames, dropTarget,
    selectedGroupName, groupOptions, activeGroupId,
    myGroupName, myGroupMembers,
    getStudentObj, onDragStart, onGroupDragOver, onDrop, onInnerDrop,
    addGroup, removeGroup, onRename, saveGroups, loadData,
  }
  provide(CourseGroupsKey, ctx)
  return ctx
}

export function useCourseGroupsContext(): CourseGroupsCtx {
  const ctx = inject(CourseGroupsKey)
  if (!ctx) throw new Error('useCourseGroupsContext must be used within CourseGroupsModal')
  return ctx
}
