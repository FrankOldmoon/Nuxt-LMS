/**
 * doc module schema 片段
 *
 * 包含表：categories, courses, chapters, chapterVersions, courseVersions
 *
 * 跨 module 外键依赖：
 * - chapters.userId → users.id（auth module）
 * 聚合时由 base 解析跨 module 引用。
 */
import {
  pgTable,
  serial,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  foreignKey,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { withTimestamps } from '../../base/server/db/schema';

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 100 }),
  order: integer('order').default(0),
  orders: jsonb('orders').default('[]'),
  ...withTimestamps,
});

export const courses = pgTable(
  'courses',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 100 }),
    categoryId: integer('category_id').notNull(),
    content: jsonb('content').default('{"content":{},"type":"doc"}'),
    orders: jsonb('orders').default('[]'),
    gradeCriteria: jsonb('grade_criteria'),
    tags: jsonb('tags').default('[]'),
    config: jsonb('config'),
    ...withTimestamps,
  },
  (t) => ({
    catFk: foreignKey({ columns: [t.categoryId], foreignColumns: [categories.id] }).onDelete('cascade'),
    catIdx: index('idx_courses_category_id').on(t.categoryId),
  })
);

export const chapters = pgTable(
  'chapters',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 100 }),
    content: jsonb('content').default('{"content":{},"type":"doc"}'),
    tags: jsonb('tags').default('[]'),
    questionIds: jsonb('question_ids').default('[]'),
    homeworkIds: jsonb('homework_ids').default('[]'),
    quizIds: jsonb('quiz_ids').default('[]'),
    commentIds: jsonb('comment_ids').default('[]'),
    objectives: jsonb('objectives').default('[]'),
    tasks: jsonb('tasks').default('[]'),
    courseId: integer('course_id').notNull(),
    isOpen: boolean('is_open').default(false),
    userId: integer('user_id'),
    ...withTimestamps,
  },
  (t) => ({
    courseFk: foreignKey({ columns: [t.courseId], foreignColumns: [courses.id] }).onDelete('cascade'),
    // authorFk: foreignKey({ columns: [t.userId], foreignColumns: [users.id] }).onDelete('set null'), // users 在 auth module
    courseIdx: index('idx_chapters_course_id').on(t.courseId),
    authorIdx: index('idx_chapters_user_id').on(t.userId),
  })
);

export const chapterVersions = pgTable(
  'chapter_versions',
  {
    id: serial('id').primaryKey(),
    chapterId: integer('chapter_id').notNull(),
    content: jsonb('content').default('{"content":{},"type":"doc"}'),
    ...withTimestamps,
  },
  (t) => ({
    chapterFk: foreignKey({ columns: [t.chapterId], foreignColumns: [chapters.id] }).onDelete('cascade'),
    chapterIdx: index('idx_chapter_versions_chapter_id').on(t.chapterId),
  })
);

export const courseVersions = pgTable(
  'course_versions',
  {
    id: serial('id').primaryKey(),
    courseId: integer('course_id').notNull(),
    content: jsonb('content').default('{"content":{},"type":"doc"}'),
    ...withTimestamps,
  },
  (t) => ({
    courseFk: foreignKey({ columns: [t.courseId], foreignColumns: [courses.id] }).onDelete('cascade'),
    courseIdx: index('idx_course_versions_course_id').on(t.courseId),
  })
);

// ====================== Relations ======================
export const categoriesRelations = relations(categories, ({ many }) => ({
  courses: many(courses),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  category: one(categories, { fields: [courses.categoryId], references: [categories.id] }),
  chapters: many(chapters),
  chapterVersions: many(chapterVersions),
  courseVersions: many(courseVersions),
}));

export const chaptersRelations = relations(chapters, ({ one, many }) => ({
  course: one(courses, { fields: [chapters.courseId], references: [courses.id] }),
  versions: many(chapterVersions),
}));
