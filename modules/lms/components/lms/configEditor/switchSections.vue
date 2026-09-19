<template>
  <!-- 开关配置区域（课程/章节按钮/课程按钮/首页/章节页） -->
  <div v-for="section in sections" :key="section.configKey" v-show="section.configKey !== 'course' || !hideCourse"
    class="space-y-2">
    <p class="text-sm font-medium">{{ $t(section.title) }}</p>
    <div class="grid grid-cols-2 gap-2">
      <div v-for="f in section.fields" :key="f.key" class="flex items-center justify-between">
        <span class="text-xs">{{ $t(f.label) }}</span>
        <USwitch v-model="config[section.configKey][f.key]" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { config, hideCourse } = useConfigEditorContext()

const sections = [
  { title: 'lmsConfig.course', configKey: 'course', fields: [
    { key: 'showDanmaku', label: 'courseEditor.showDanmaku' },
    { key: 'showAnnouncement', label: 'courseEditor.showAnnouncement' },
    { key: 'showComments', label: 'courseEditor.showComments' },
    { key: 'showProgress', label: 'courseEditor.showProgress' },
    { key: 'defaultChapterOpen', label: 'courseEditor.defaultChapterOpen' },
  ] },
  { title: 'lmsConfig.chapterBtns', configKey: 'chapterBtns', fields: [
    { key: 'showPlay', label: 'chapter.play' },
    { key: 'showScore', label: 'chapter.score' },
    { key: 'showSelect', label: 'chapter.select' },
    { key: 'showTimer', label: 'chapter.timer' },
    { key: 'showInvite', label: 'chapter.invite' },
    { key: 'showDanmaku', label: 'chapter.danmaku' },
    { key: 'showVote', label: 'chapter.vote' },
    { key: 'showQuickAnswer', label: 'chapter.quickAnswer' },
  ] },
  { title: 'lmsConfig.courseBtns', configKey: 'courseBtns', fields: [
    { key: 'showProgress', label: 'coursePanel.progress' },
    { key: 'showLeaderboard', label: 'coursePanel.leaderboard' },
    { key: 'showGroups', label: 'coursePanel.groups' },
    { key: 'showGrades', label: 'coursePanel.grades' },
    { key: 'showAnnouncements', label: 'coursePanel.announcements' },
    { key: 'showWrongBook', label: 'chapter.wrongBook' },
    { key: 'showMmo', label: 'mmo.showMmo' },
  ] },
  { title: 'lmsConfig.home', configKey: 'home', fields: [
    { key: 'showHero', label: 'lmsConfig.showHero' },
    { key: 'showStats', label: 'lmsConfig.showStats' },
    { key: 'showRecentCourses', label: 'lmsConfig.showRecentCourses' },
    { key: 'showLeaderboard', label: 'lmsConfig.showLeaderboard' },
  ] },
  { title: 'lmsConfig.chapterPage', configKey: 'chapterPage', fields: [
    { key: 'showOutline', label: 'lmsConfig.showOutline' },
    { key: 'showNote', label: 'lmsConfig.showNote' },
    { key: 'showDanmakuPanel', label: 'lmsConfig.showDanmakuPanel' },
    { key: 'enableFullscreen', label: 'lmsConfig.enableFullscreen' },
  ] },
]
</script>
