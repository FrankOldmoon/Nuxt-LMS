<template>
  <!-- on/offConfigurationarea（Course/ChapterButton/CourseButton/Home/Chapterpage） -->
  <div v-for="section in sections" :key="section.config key" v-show="section.config key !== 'course' || !hideCourse"
    class="space-y-2">
    <p class="text-sm font-medium">{{ $t(section.title) }}</p>
    <div class="grid grid-cols-2 gap-2">
      <div v-for="f in section.fields" :key="f.key" class="flex items-center justify-between">
        <span class="text-xs">{{ $t(f.label) }}</span>
        <USwitch v-model="config[section.config key][f.key]" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { config, hideCourse } = useConfigEditorContext()

const sections = [
  { title: 'lmsConfig.course', config key: 'course', fields: [
    { key: 'showDanmaku', label: 'courseEditor.showDanmaku' },
    { key: 'showAnnouncement', label: 'courseEditor.showAnnouncement' },
    { key: 'showComments', label: 'courseEditor.showComments' },
    { key: 'showProgress', label: 'courseEditor.showProgress' },
    { key: 'defaultChapterOpen', label: 'courseEditor.defaultChapterOpen' },
  ] },
  { title: 'lmsConfig.chapterBtns', config key: 'chapterBtns', fields: [
    { key: 'showPlay', label: 'chapter.play' },
    { key: 'showScore', label: 'chapter.score' },
    { key: 'showSelect', label: 'chapter.select' },
    { key: 'showTimer', label: 'chapter.timer' },
    { key: 'showInvite', label: 'chapter.invite' },
    { key: 'showDanmaku', label: 'chapter.danmaku' },
    { key: 'showVote', label: 'chapter.vote' },
    { key: 'showQuickAnswer', label: 'chapter.quickAnswer' },
  ] },
  { title: 'lmsConfig.courseBtns', config key: 'courseBtns', fields: [
    { key: 'showProgress', label: 'coursePanel.progress' },
    { key: 'showLeaderboard', label: 'coursePanel.leaderboard' },
    { key: 'showGroups', label: 'coursePanel.groups' },
    { key: 'showGrades', label: 'coursePanel.grades' },
    { key: 'showAnnouncements', label: 'coursePanel.announcements' },
    { key: 'showWrongBook', label: 'chapter.wrongBook' },
  ] },
  { title: 'lmsConfig.home', config key: 'home', fields: [
    { key: 'showHero', label: 'lmsConfig.showHero' },
    { key: 'showStats', label: 'lmsConfig.showStats' },
    { key: 'showRecentCourses', label: 'lmsConfig.showRecentCourses' },
    { key: 'showLeaderboard', label: 'lmsConfig.showLeaderboard' },
  ] },
  { title: 'lmsConfig.chapterPage', config key: 'chapterPage', fields: [
    { key: 'showOutline', label: 'lmsConfig.showOutline' },
    { key: 'showNote', label: 'lmsConfig.showNote' },
    { key: 'showDanmakuPanel', label: 'lmsConfig.showDanmakuPanel' },
    { key: 'enableFullscreen', label: 'lmsConfig.enableFullscreen' },
  ] },
]
</script>
