<template>
  <UModal v-model:open="isOpen" :ui="{ content: 'sm:max-w-md' }">
    <template #content>
      <div class="p-6">
        <!-- Tab 切换 -->
        <div class="flex gap-1 p-1 bg-(--ui-bg-muted) rounded-lg mb-6">
          <button
            :class="[
              'flex-1 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer',
              activeTab === 'login'
                ? 'bg-(--ui-bg) text-(--ui-text-highlighted) shadow-sm'
                : 'text-(--ui-text-muted) hover:text-(--ui-text)',
            ]"
            @click="activeTab = 'login'"
          >
            {{ $t('auth.login') }}
          </button>
          <button
            :class="[
              'flex-1 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer',
              activeTab === 'register'
                ? 'bg-(--ui-bg) text-(--ui-text-highlighted) shadow-sm'
                : 'text-(--ui-text-muted) hover:text-(--ui-text)',
            ]"
            @click="activeTab = 'register'"
          >
            {{ $t('auth.register') }}
          </button>
        </div>

        <!-- 登录表单 -->
        <AuthLoginForm
          v-if="activeTab === 'login'"
          @success="onSuccess"
          @switch-to-register="activeTab = 'register'"
        />

        <!-- 注册表单 -->
        <AuthRegisterForm
          v-if="activeTab === 'register'"
          @success="onSuccess"
          @switch-to-login="activeTab = 'login'"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const isOpen = defineModel<boolean>('open', { default: false })
const activeTab = ref<'login' | 'register'>('login')

const emit = defineEmits<{
  success: []
}>()

// 关闭时重置 tab
watch(isOpen, (val) => {
  if (!val) {
    activeTab.value = 'login'
  }
})

function onSuccess() {
  isOpen.value = false
  emit('success')
}
</script>
