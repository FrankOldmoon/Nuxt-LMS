import type { MedalContent } from './types'

// ====================== Default medals ======================

export const DEFAULT_MEDALS: { name: string; content: MedalContent }[] = [
  {
    name: 'First Steps',
    content: {
      icon: 'i-lucide-sprout', color: 'success', tier: 1,
      description: 'Complete your first question',
      conditions: [{ metric: 'questionCount', op: '>=', value: 1 }],
      logic: 'all',
    },
  },
  {
    name: 'Diligent Star',
    content: {
      icon: 'i-lucide-zap', color: 'warning', tier: 2,
      description: 'Answer 50 questions',
      conditions: [{ metric: 'questionCount', op: '>=', value: 50 }],
      logic: 'all',
    },
  },
  {
    name: 'Homework Master',
    content: {
      icon: 'i-lucide-book-open-check', color: 'info', tier: 2,
      description: 'Submit 10 homework assignments',
      conditions: [{ metric: 'homeworkCount', op: '>=', value: 10 }],
      logic: 'all',
    },
  },
  {
    name: 'Commentator',
    content: {
      icon: 'i-lucide-message-circle', color: 'primary', tier: 1,
      description: 'Post 20 comments',
      conditions: [{ metric: 'commentCount', op: '>=', value: 20 }],
      logic: 'all',
    },
  },
  {
    name: 'Quiz Expert',
    content: {
      icon: 'i-lucide-clipboard-check', color: 'info', tier: 3,
      description: 'Score 100 in quizzes',
      conditions: [{ metric: 'quizScore', op: '>=', value: 100 }],
      logic: 'all',
    },
  },
  {
    name: 'Race Champion',
    content: {
      icon: 'i-lucide-trophy', color: 'error', tier: 3,
      description: 'Score 100 in races',
      conditions: [{ metric: 'raceScore', op: '>=', value: 100 }],
      logic: 'all',
    },
  },
  {
    name: 'Scholar',
    content: {
      icon: 'i-lucide-graduation-cap', color: 'warning', tier: 3,
      description: 'Reach 500 total course score',
      conditions: [{ metric: 'courseScore', op: '>=', value: 500 }],
      logic: 'all',
    },
  },
  {
    name: 'Level Achiever',
    content: {
      icon: 'i-lucide-star', color: 'warning', tier: 2,
      description: 'Reach level 5',
      conditions: [{ metric: 'level', op: '>=', value: 5 }],
      logic: 'all',
    },
  },
  {
    name: 'Chapter Master',
    content: {
      icon: 'i-lucide-flag', color: 'error', tier: 4,
      description: 'Complete 10 chapters',
      conditions: [{ metric: 'chapterPassCount', op: '>=', value: 10 }],
      logic: 'all',
    },
  },
  {
    name: 'Diamond Scholar',
    content: {
      icon: 'i-lucide-gem', color: 'info', tier: 4,
      description: 'Reach 1000 course score and level 10',
      conditions: [
        { metric: 'courseScore', op: '>=', value: 1000 },
        { metric: 'level', op: '>=', value: 10 },
      ],
      logic: 'all',
    },
  },
]
