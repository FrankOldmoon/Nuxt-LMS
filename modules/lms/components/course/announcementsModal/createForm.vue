<template>
  <!-- 新建表单入口（仅教师） -->
  <div v-if="canCreate" class="flex justify-end">
    <UButton :icon="showCreateForm ? 'i-lucide-x' : 'i-lucide-plus'"
      :label="showCreateForm ? $t('common.cancel') : $t('announcement.new')" color="primary"
      variant="soft" size="sm" @click="toggleCreateForm" />
  </div>

  <!-- 新建表单 -->
  <div v-if="showCreateForm && canCreate"
    class="p-4 border border-default rounded-lg space-y-3 bg-elevated/30">
    <UFormField :label="$t('announcement.name')" required>
      <UInput v-model="form.name" :placeholder="$t('announcement.namePlaceholder')"
        :ui="{ root: 'w-full' }" />
    </UFormField>

    <UFormField :label="$t('announcement.content')">
      <RichEditor v-model="form.contentText" />
    </UFormField>

    <UFormField :label="$t('announcement.targetClasses')">
      <div class="flex flex-wrap gap-3">
        <UCheckbox v-for="cls in classes" :key="cls.id"
          :model-value="form.classIds.includes(cls.id)" :label="cls.name"
          @update:model-value="(v) => toggleClass(cls.id, v)" />
        <span v-if="!classes.length" class="text-xs text-muted">
          {{ $t('announcement.noClasses') }}
        </span>
      </div>
      <p class="text-xs text-muted mt-1.5">
        {{ $t('announcement.targetClassesHint') }}
      </p>
    </UFormField>

    <div class="flex justify-end gap-2 pt-2">
      <UButton variant="ghost" size="sm" @click="showCreateForm = false">
        {{ $t('common.cancel') }}
      </UButton>
      <UButton color="primary" size="sm" :loading="creating" :disabled="!form.name.trim()"
        @click="createAnnouncement">
        {{ $t('announcement.publish') }}
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
const {
  canCreate, showCreateForm, form, classes, creating,
  toggleClass, toggleCreateForm, createAnnouncement,
} = useAnnouncementsContext()
</script>
