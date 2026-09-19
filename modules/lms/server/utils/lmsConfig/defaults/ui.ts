/**
 * LMS UI 显隐开关（首页/课程/章节/列表）
 */
export const uiDefaults = {
  home: {
    showHero: true,
    showStats: true,
    showRecentCourses: true,
    showLeaderboard: true,
  },
  courseList: {
    showSearch: true,
    showFilter: true,
    showSort: true,
    defaultView: 'grid',
  },
  course: {
    showDanmaku: true,
    showAnnouncement: true,
    showComments: true,
    showProgress: false,
    defaultChapterOpen: true,
  },
  courseBtns: {
    showProgress: true,
    showLeaderboard: true,
    showGroups: true,
    showGrades: true,
    showAnnouncements: true,
    showWrongBook: true,
    showMmo: true,
  },
  chapterBtns: {
    showPlay: true,
    showScore: true,
    showSelect: true,
    showTimer: true,
    showInvite: true,
    showDanmaku: true,
    showVote: true,
    showQuickAnswer: true,
  },
  chapterPage: {
    showOutline: true,
    showNote: true,
    showDanmakuPanel: true,
    enableFullscreen: true,
  },
}
