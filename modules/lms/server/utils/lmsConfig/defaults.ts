/**
 * LMS learning behavior parameter defaults
 *
 * Storage pattern: flattened into the configs table (id = "lms:section.key", value = scalar)
 * A tree-shaped cache is kept in memory at runtime, compatible with the historical DEFAULT tree interface.
 *
 * Split sub-modules:
 * - ./learning: questions/homework/comments/chapters/quizzes
 * - ./race: races
 * - ./ui: home/course/chapter UI visibility
 * - ./user: general/users/cloud drive
 * - ./ai: AI assistant
 */
import { learningDefaults } from './defaults/learning'
import { raceDefaults } from './defaults/race'
import { uiDefaults } from './defaults/ui'
import { userDefaults } from './defaults/user'
import { aiDefaults } from './defaults/ai'

export const DEFAULT_LMS_CONFIG = {
  ...learningDefaults,
  race: raceDefaults,
  ...uiDefaults,
  ...userDefaults,
  ai: aiDefaults,
}
