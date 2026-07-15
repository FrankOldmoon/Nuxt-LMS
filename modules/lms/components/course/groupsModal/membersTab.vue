<template>
    <!-- Student view: only show the group they belong to -->
    <div v-if="!canEdit" class="space-y-4 max-w-md mx-auto">
        <div v-if="myGroupMembers.length > 0">
            <div class="text-sm font-medium mb-2">{{ myGroupName }}</div>
            <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    <div v-for="s in myGroupMembers" :key="s.userId" class="relative">
                        <AuthUserCard :user="getStudentObj(s)" />
                        <UBadge v-if="s._isLeader" color="primary" variant="subtle" size="xs"
                            class="absolute top-1 right-1">{{ $t('coursePanel.leader') }}</UBadge>
                    </div>
                </div>
            </div>
        </div>
        <div v-else class="text-center py-6 text-gray-400 text-sm">{{ $t('coursePanel.ungrouped') }}</div>
    </div>

    <!-- Teacher view: full edit interface -->
    <div v-else class="flex gap-4">
        <!-- Ungrouped student -->
        <div class="w-56 flex-shrink-0">
            <div class="text-xs font-medium text-gray-400 mb-2">
                {{ $t('coursePanel.ungrouped') }} ({{ ungrouped.length }})
            </div>
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

        <!-- Group List -->
        <div class="flex-1 flex flex-wrap gap-3">
            <div v-for="(members, groupName) in groupData" :key="groupName" class="w-64 flex-shrink-0"
                @dragover.prevent="onGroupDragOver($event, groupName as string)" @drop="onDrop($event, groupName as string)">
                <div class="flex items-center justify-between mb-1">
                    <input v-model="groupNames[groupName as string]"
                        class="text-sm font-medium bg-transparent border-b border-transparent focus:border-primary-400 outline-none flex-1"
                        @change="onRename(groupName as string, $event)" />
                    <UButton icon="i-lucide-x" color="error" variant="ghost" size="2xs"
                        @click="removeGroup(groupName as string)" />
                </div>
                <div class="min-h-[80px] p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-600"
                    :class="{ 'ring-2 ring-primary-300': dropTarget === `${groupName}:inner` }">
                    <div class="grid grid-cols-2 gap-1.5">
                        <div v-for="(s, idx) in members" :key="s.userId" draggable="true"
                            @dragstart="onDragStart($event, s, groupName as string)"
                            @dragover.prevent.stop
                            @drop="onInnerDrop($event, groupName as string, idx)"
                            class="relative"
                            :class="{ 'ring-2 ring-primary-300 rounded-lg': dropTarget === `${groupName}:${idx}` }">
                            <AuthUserCard :user="getStudentObj(s)" />
                            <UBadge v-if="idx === 0" color="primary" variant="subtle" size="xs"
                                class="absolute top-1 right-1">{{ $t('coursePanel.leader') }}</UBadge>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
const {
    canEdit, ungrouped, groupData, groupNames, dropTarget,
    myGroupName, myGroupMembers,
    getStudentObj, onDragStart, onGroupDragOver, onDrop, onInnerDrop,
    removeGroup, onRename,
} = useCourseGroupsContext()
</script>
