<template>
  <!-- AnnouncementList -->
  <div v-if="pending" class="py-8 text-center text-muted">
    {{ $t('common.loading') }}
  </div>
  <div v-else-if="!announcements.length" class="py-8 text-center text-muted">
    {{ $t('announcement.empty') }}
  </div>
  <div v-else class="space-y-3">
    <div v-for="item in announcements" :key="item.id" class="p-3 border border-default rounded-lg">
      <div class="flex items-start justify-between gap-2">
        <div class="flex-1 min-w-0">
          <div class="font-medium text-highlighted truncate">{{ item.name }}</div>
          <div class="flex items-center gap-2 text-xs text-muted mt-0.5">
            <span>{{ formatTime(item.createdAt) }}</span>
            <span>·</span>
            <UBadge v-if="item.classId"
              :label="classMap.get(item.classId)?.name || $t('announcement.classLabel', { id: item.classId })"
              color="info" variant="subtle" size="sm" />
            <UBadge v-else :label="$t('announcement.allClasses')" color="neutral"
              variant="subtle" size="sm" />
          </div>
          <div v-if="item.content" class="mt-2 text-sm whitespace-pre-wrap text-highlighted">
            {{ renderContent(item.content) }}
          </div>
        </div>
        <UButton v-if="canCreate" icon="i-lucide-trash-2" color="error" variant="ghost" size="xs"
          @click="deleteAnnouncement(item.id)" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const {
  pending, announcements, classMap, canCreate,
  formatTime, renderContent, deleteAnnouncement,
} = useAnnouncementsContext()
</script>
