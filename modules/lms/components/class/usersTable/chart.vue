<template>
  <ClientOnly v-if="showChart() && students.length">
    <div class="mt-4 relative">
      <Chart :option="chartOption" height="320" />
      <!-- 右侧 HTML 覆盖层：头像 + 名字 -->
      <div class="absolute top-0 right-0 h-full flex flex-col justify-around py-[10px]" style="width: 120px;">
        <div v-for="item in chartData" :key="item.id"
          class="flex items-center gap-1.5 h-6 transition-all duration-700 ease-in-out">
          <UAvatar :src="item.avatarImg || undefined" :alt="item.name" size="2xs"
            :text="item.name?.charAt(0)" class="shrink-0" />
          <span class="text-xs truncate" :class="chartData.indexOf(item) < 3 ? 'font-bold' : ''">
            {{ item.name }}
          </span>
        </div>
      </div>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
const { chartData, chartOption, showChart, students } = useClassUsersTableContext()
</script>
