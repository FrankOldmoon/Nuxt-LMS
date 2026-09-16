/**
 * module schema 片段
 *
 * 包含表：categories, courses, chapters, chapterVersions, courseVersions
 *
 * 跨 module 外键依赖：
 * - chapters.userId → users.id（auth module）
 * 聚合时由 base 解析跨 module 引用。
 */
import {
  pgTable,
  pgEnum,
  serial,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  numeric,
  primaryKey,
  foreignKey,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { withTimestamps, classes } from '../../../base/server/db/schema';

/** 课程状态枚举 */
export const courseStatusEnum = pgEnum('course_status', ['published', 'draft', 'archived']);

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
    // 课程状态：published(已发布)/draft(草稿)/archived(归档)，默认已发布
    status: courseStatusEnum('status').default('published').notNull(),
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


// ====================== 勋章/游戏化 ======================
export const medals = pgTable('medals', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  content: jsonb('content'),
  ...withTimestamps,
});

export const userMedals = pgTable(
  'user_medals',
  {
    userId: integer('user_id').notNull(),
    medalId: integer('medal_id').notNull(),
    ...withTimestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.medalId] }),
    // userFk: foreignKey({ columns: [t.userId], foreignColumns: [users.id] }).onDelete('cascade'), // users 在 auth
    medalFk: foreignKey({ columns: [t.medalId], foreignColumns: [medals.id] }).onDelete('cascade'),
    userIdx: index('idx_user_medals_user_id').on(t.userId),
    medalIdx: index('idx_user_medals_medal_id').on(t.medalId),
  })
);

// ====================== 公告 ======================
export const announcements = pgTable(
  'announcements',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    content: jsonb('content'),
    classId: integer('class_id'),
    courseId: integer('course_id').notNull(),
    ...withTimestamps,
  },
  (t) => ({
    // courseFk: foreignKey({ columns: [t.courseId], foreignColumns: [courses.id] }).onDelete('cascade'), // courses 在 doc
    classFk: foreignKey({ columns: [t.classId], foreignColumns: [classes.id] }).onDelete('set null'),
    courseIdx: index('idx_announcements_course_id').on(t.courseId),
    classIdx: index('idx_announcements_class_id').on(t.classId),
  })
);

// ====================== 教学内容（复合主键 courseId + cid） ======================
export const questions = pgTable(
  'questions',
  {
    courseId: integer('course_id').notNull(),
    cid: integer('cid').notNull(),
    name: varchar('name', { length: 255 }).default('question'),
    content: jsonb('content').default('{"content":{},"type":"doc"}'),
    options: jsonb('options').default('[]'),
    answer: jsonb('answer').default('[]'),
    submitCount: integer('submit_count').default(0),
    correctCount: integer('correct_count').default(0),
    wrongCount: integer('wrong_count').default(0),
    point: integer('point').default(1),
    type: varchar('type', { length: 50 }).default('single'),
    difficulty: integer('difficulty').default(1),
    tags: jsonb('tags').default('[]'),
    extra: jsonb('extra'),
    explanation: jsonb('explanation').default('{"content":{},"type":"doc"}'),
    ...withTimestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.courseId, t.cid] }),
    // courseFk: foreignKey({ columns: [t.courseId], foreignColumns: [courses.id] }).onDelete('cascade'), // courses 在 doc
    courseIdx: index('idx_questions_course_id').on(t.courseId),
    typeIdx: index('idx_questions_type').on(t.type),
  })
);

export const homeworks = pgTable(
  'homeworks',
  {
    courseId: integer('course_id').notNull(),
    cid: integer('cid').notNull(),
    name: varchar('name', { length: 255 }),
    code: varchar('code', { length: 100 }),
    content: jsonb('content'),
    submitCount: integer('submit_count').default(0),
    avgPoint: numeric('avg_point', { precision: 10, scale: 2 }).default('0'),
    point: integer('point').default(10),
    extra: jsonb('extra'),
    tags: jsonb('tags'),
    explanation: jsonb('explanation'),
    ...withTimestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.courseId, t.cid] }),
    // courseFk: foreignKey({ columns: [t.courseId], foreignColumns: [courses.id] }).onDelete('cascade'), // courses 在 doc
  })
);

export const quizzes = pgTable(
  'quizzes',
  {
    courseId: integer('course_id').notNull(),
    cid: integer('cid').notNull(),
    name: varchar('name', { length: 255 }),
    code: varchar('code', { length: 100 }),
    content: jsonb('content'),
    questions: jsonb('questions'),
    timeLimit: integer('time_limit').default(600),
    submitCount: integer('submit_count').default(0),
    submitLimit: integer('submit_limit').default(1),
    startAt: timestamp('start_at', { withTimezone: true }),
    endAt: timestamp('end_at', { withTimezone: true }),
    avgPoint: numeric('avg_point', { precision: 10, scale: 2 }).default('0'),
    point: integer('point').default(100),
    extra: jsonb('extra'),
    tags: jsonb('tags'),
    ...withTimestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.courseId, t.cid] }),
    // courseFk: foreignKey({ columns: [t.courseId], foreignColumns: [courses.id] }).onDelete('cascade'), // courses 在 doc
  })
);

export const races = pgTable(
  'races',
  {
    courseId: integer('course_id').notNull(),
    cid: integer('cid').notNull(),
    name: varchar('name', { length: 255 }),
    content: jsonb('content'),
    tags: jsonb('tags'),
    point: integer('point'),
    questionIds: jsonb('question_ids').default('[]'),
    gapTime: integer('gap_time').default(10),
    records: jsonb('records').default('[]'),
    ...withTimestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.courseId, t.cid] }),
    // courseFk: foreignKey({ columns: [t.courseId], foreignColumns: [courses.id] }).onDelete('cascade'), // courses 在 doc
  })
);

// ====================== 同伴互评（peer review） ======================
export const peerReviewConfigs = pgTable(
  'peer_review_configs',
  {
    courseId: integer('course_id').notNull(),
    cid: integer('cid').notNull(),
    name: varchar('name', { length: 255 }),
    // 评价项数组：[{ key, label, maxScore }]
    options: jsonb('options').default([]),
    ...withTimestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.courseId, t.cid] }),
  })
);

/** 同伴互评评分记录：fromUserId 评价 targetUserId，可覆盖修改 */
export const peerReviews = pgTable(
  'peer_reviews',
  {
    courseId: integer('course_id').notNull(),
    cid: integer('cid').notNull(),
    fromUserId: integer('from_user_id').notNull(),
    targetUserId: integer('target_user_id').notNull(),
    // { key: 分值 }，key 对应 peer_review_configs.options 里的 key
    scores: jsonb('scores').default({}),
    ...withTimestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.courseId, t.cid, t.fromUserId, t.targetUserId] }),
    targetIdx: index('idx_peer_reviews_target').on(t.courseId, t.cid, t.targetUserId),
  })
);

export const comments = pgTable(
  'comments',
  {
    courseId: integer('course_id').notNull(),
    cid: integer('cid').notNull(),
    name: varchar('name', { length: 255 }),
    code: varchar('code', { length: 100 }),
    content: jsonb('content'),
    userId: integer('user_id').notNull(),
    parentId: integer('parent_id'),
    tags: jsonb('tags'),
    point: integer('point').default(1),
    status: varchar('status', { length: 30 }).default('audit'),
    ...withTimestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.courseId, t.cid] }),
    // courseFk: foreignKey({ columns: [t.courseId], foreignColumns: [courses.id] }).onDelete('cascade'), // courses 在 doc
    // userFk: foreignKey({ columns: [t.userId], foreignColumns: [users.id] }).onDelete('cascade'), // users 在 auth
    parentFk: foreignKey({
      columns: [t.courseId, t.parentId],
      foreignColumns: [t.courseId, t.cid],
    }).onDelete('set null'),
    userIdx: index('idx_comments_user_id').on(t.userId),
    parentIdx: index('idx_comments_parent').on(t.courseId, t.parentId),
  })
);

// ====================== 用户行为中间表 ======================
export const userChapters = pgTable(
  'user_chapters',
  {
    userId: integer('user_id').notNull(),
    chapterId: integer('chapter_id').notNull(),
    score: numeric('score', { precision: 8, scale: 2 }).default('0'),
    selfScore: jsonb('self_score'),
    taskStatus: jsonb('task_status'),
    isPass: boolean('is_pass').default(false),
    readTime: integer('read_time').default(0),
    record: jsonb('record').default('[]'),
    ...withTimestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.chapterId] }),
    // userFk / chapterFk 在 auth/doc module
    userIdx: index('idx_user_chapters_user_id').on(t.userId),
    chapterIdx: index('idx_user_chapters_chapter_id').on(t.chapterId),
  })
);

export const userQuestions = pgTable(
  'user_questions',
  {
    userId: integer('user_id').notNull(),
    courseId: integer('course_id').notNull(),
    questionCid: integer('question_cid').notNull(),
    score: numeric('score', { precision: 8, scale: 2 }).default('0'),
    records: jsonb('records'),
    correctRate: numeric('correct_rate', { precision: 5, scale: 2 }),
    wrongCount: integer('wrong_count'),
    firstRecord: jsonb('first_record'),
    firstRight: boolean('first_right').default(false),
    submitCount: integer('submit_count').default(0),
    ...withTimestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.courseId, t.questionCid] }),
    questionFk: foreignKey({ columns: [t.courseId, t.questionCid], foreignColumns: [questions.courseId, questions.cid] }).onDelete('cascade'),
    userIdx: index('idx_user_questions_user_id').on(t.userId),
    questionIdx: index('idx_user_questions_question').on(t.courseId, t.questionCid),
  })
);

export const userCourses = pgTable(
  'user_courses',
  {
    userId: integer('user_id').notNull(),
    courseId: integer('course_id').notNull(),
    isTeacher: boolean('is_teacher'),
    isEditor: boolean('is_editor'),
    grade: varchar('grade', { length: 50 }),
    score: numeric('score', { precision: 10, scale: 2 }).default('0'),
    attitudeScore: numeric('attitude_score', { precision: 10, scale: 2 }).default('0'),
    questionScore: numeric('question_score', { precision: 10, scale: 2 }).default('0'),
    quizScore: numeric('quiz_score', { precision: 10, scale: 2 }).default('0'),
    homeworkScore: numeric('homework_score', { precision: 10, scale: 2 }).default('0'),
    commentScore: numeric('comment_score', { precision: 10, scale: 2 }).default('0'),
    peerScore: numeric('peer_score', { precision: 10, scale: 2 }).default('0'),
    externalScore: numeric('external_score', { precision: 10, scale: 2 }).default('0'),
    abilities: jsonb('abilities'),
    records: jsonb('records'),
    number: varchar('number', { length: 100 }),
    group: varchar('group', { length: 100 }),
    exp: integer('exp').default(0),
    coin: integer('coin').default(0),
    ...withTimestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.courseId] }),
    userIdx: index('idx_user_courses_user_id').on(t.userId),
    courseIdx: index('idx_user_courses_course_id').on(t.courseId),
  })
);

export const userHomeworks = pgTable(
  'user_homeworks',
  {
    userId: integer('user_id').notNull(),
    courseId: integer('course_id').notNull(),
    homeworkCid: integer('homework_cid').notNull(),
    content: jsonb('content'),
    score: numeric('score', { precision: 10, scale: 2 }),
    record: jsonb('record'),
    files: jsonb('files'),
    comment: jsonb('comment'),
    // 优秀作业标记：教师端设为 true 后，同班学生可看到该份作业
    excellent: boolean('excellent').default(false),
    ...withTimestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.courseId, t.homeworkCid] }),
    homeworkFk: foreignKey({ columns: [t.courseId, t.homeworkCid], foreignColumns: [homeworks.courseId, homeworks.cid] }).onDelete('cascade'),
    userIdx: index('idx_user_homeworks_user_id').on(t.userId),
    homeworkIdx: index('idx_user_homeworks_homework').on(t.courseId, t.homeworkCid),
  })
);

export const userComments = pgTable(
  'user_comments',
  {
    userId: integer('user_id').notNull(),
    courseId: integer('course_id').notNull(),
    commentCid: integer('comment_cid').notNull(),
    like: boolean('like'),
    ...withTimestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.courseId, t.commentCid] }),
    commentFk: foreignKey({ columns: [t.courseId, t.commentCid], foreignColumns: [comments.courseId, comments.cid] }).onDelete('cascade'),
    userIdx: index('idx_user_comments_user_id').on(t.userId),
  })
);

export const userRaces = pgTable(
  'user_races',
  {
    userId: integer('user_id').notNull(),
    courseId: integer('course_id').notNull(),
    raceCid: integer('race_cid').notNull(),
    score: numeric('score', { precision: 10, scale: 2 }),
    records: jsonb('records'),
    ...withTimestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.courseId, t.raceCid] }),
    raceFk: foreignKey({ columns: [t.courseId, t.raceCid], foreignColumns: [races.courseId, races.cid] }).onDelete('cascade'),
    userIdx: index('idx_user_races_user_id').on(t.userId),
  })
);

// ====================== 学生作品展示 showcase ======================
export const showcases = pgTable(
  'showcases',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    category: varchar('category', { length: 30 }).default('software'),
    cover: varchar('cover', { length: 500 }),
    content: jsonb('content'),
    tags: jsonb('tags').default([]),
    status: varchar('status', { length: 30 }).default('pending'),
    likeCount: integer('like_count').default(0),
    approvedBy: integer('approved_by'),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    ...withTimestamps,
  },
  (t) => ({
    userIdx: index('idx_showcases_user_id').on(t.userId),
    statusIdx: index('idx_showcases_status').on(t.status),
    categoryIdx: index('idx_showcases_category').on(t.category),
  })
);

export const showcaseLikes = pgTable(
  'showcase_likes',
  {
    userId: integer('user_id').notNull(),
    showcaseId: integer('showcase_id').notNull(),
    like: boolean('like').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.showcaseId] }),
    showcaseFk: foreignKey({ columns: [t.showcaseId], foreignColumns: [showcases.id] }).onDelete('cascade'),
    userIdx: index('idx_showcase_likes_user_id').on(t.userId),
  })
);

export const showcaseUsers = pgTable(
  'showcase_users',
  {
    showcaseId: integer('showcase_id').notNull(),
    userId: integer('user_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.showcaseId, t.userId] }),
    showcaseFk: foreignKey({ columns: [t.showcaseId], foreignColumns: [showcases.id] }).onDelete('cascade'),
    userIdx: index('idx_showcase_users_user_id').on(t.userId),
  })
);

export const showcaseComments = pgTable(
  'showcase_comments',
  {
    id: serial('id').primaryKey(),
    showcaseId: integer('showcase_id').notNull(),
    userId: integer('user_id').notNull(),
    parentId: integer('parent_id'),
    content: jsonb('content'),
    status: varchar('status', { length: 30 }).default('published'),
    likeCount: integer('like_count').default(0),
    ...withTimestamps,
  },
  (t) => ({
    showcaseFk: foreignKey({ columns: [t.showcaseId], foreignColumns: [showcases.id] }).onDelete('cascade'),
    parentFk: foreignKey({ columns: [t.parentId], foreignColumns: [t.id] }).onDelete('set null'),
    showcaseIdx: index('idx_showcase_comments_showcase_id').on(t.showcaseId),
    userIdx: index('idx_showcase_comments_user_id').on(t.userId),
  })
);

export const userQuizzes = pgTable(
  'user_quizzes',
  {
    userId: integer('user_id').notNull(),
    courseId: integer('course_id').notNull(),
    quizCid: integer('quiz_cid').notNull(),
    records: jsonb('records'),
    score: numeric('score', { precision: 10, scale: 2 }),
    submitCount: integer('submit_count').default(0),
    startedAt: timestamp('started_at', { withTimezone: true }),
    submitedAt: timestamp('submited_at', { withTimezone: true }),
    ...withTimestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.courseId, t.quizCid] }),
    quizFk: foreignKey({ columns: [t.courseId, t.quizCid], foreignColumns: [quizzes.courseId, quizzes.cid] }).onDelete('cascade'),
    userIdx: index('idx_user_quizzes_user_id').on(t.userId),
  })
);

// ====================== 班级关联表 ======================
export const classChapters = pgTable(
  'class_chapters',
  {
    classId: integer('class_id').notNull(),
    chapterId: integer('chapter_id').notNull(),
    open: boolean('open').default(false),
    config: jsonb('config'),
    ...withTimestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.classId, t.chapterId] }),
    classFk: foreignKey({ columns: [t.classId], foreignColumns: [classes.id] }).onDelete('cascade'),
    // chapterFk: foreignKey({ columns: [t.chapterId], foreignColumns: [chapters.id] }).onDelete('cascade'), // chapters 在 doc
    classIdx: index('idx_class_chapters_class_id').on(t.classId),
    chapterIdx: index('idx_class_chapters_chapter_id').on(t.chapterId),
  })
);

export const classCourses = pgTable(
  'class_courses',
  {
    classId: integer('class_id').notNull(),
    courseId: integer('course_id').notNull(),
    config: jsonb('config'),
    ...withTimestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.classId, t.courseId] }),
    classFk: foreignKey({ columns: [t.classId], foreignColumns: [classes.id] }).onDelete('cascade'),
    // courseFk: foreignKey({ columns: [t.courseId], foreignColumns: [courses.id] }).onDelete('cascade'), // courses 在 doc
    classIdx: index('idx_class_courses_class_id').on(t.classId),
    courseIdx: index('idx_class_courses_course_id').on(t.courseId),
  })
);

export const classRaces = pgTable(
  'class_races',
  {
    classId: integer('class_id').notNull(),
    courseId: integer('course_id').notNull(),
    raceCid: integer('race_cid').notNull(),
    currentIndex: integer('current_index').default(0),
    lastQuestionStartedAt: timestamp('last_question_started_at', { withTimezone: true }),
    ...withTimestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.classId, t.courseId, t.raceCid] }),
    classFk: foreignKey({ columns: [t.classId], foreignColumns: [classes.id] }).onDelete('cascade'),
    raceFk: foreignKey({ columns: [t.courseId, t.raceCid], foreignColumns: [races.courseId, races.cid] }).onDelete('cascade'),
    classIdx: index('idx_class_races_class_id').on(t.classId),
  })
);

export const activities = pgTable(
  'activities',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }),
    content: jsonb('content'),
    type: varchar('type', { length: 50 }).default('question'),
    chapterId: integer('chapter_id').notNull(),
    userId: integer('user_id').notNull(),
    ...withTimestamps,
  },
  (t) => ({
    // chapterFk / userFk 在 doc/auth module
    chapterIdx: index('idx_activities_chapter_id').on(t.chapterId),
    userIdx: index('idx_activities_user_id').on(t.userId),
  })
);

// ====================== 商店：商品 + 背包 ======================
export const goods = pgTable(
  'goods',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    content: jsonb('content').default('{}'),
    courseId: integer('course_id').default(0),
    price: integer('price').default(0),
    sellPrice: integer('sell_price').default(0),
    stock: integer('stock').default(-1),
    type: varchar('type', { length: 50 }).default('item'),
    order: integer('order').default(0),
    ...withTimestamps,
  },
  (t) => ({
    courseIdx: index('idx_goods_course_id').on(t.courseId),
  })
);

export const bags = pgTable(
  'bags',
  {
    userId: integer('user_id').notNull(),
    goodId: integer('good_id').notNull(),
    courseId: integer('course_id').notNull(),
    quantity: integer('quantity').default(1),
    ...withTimestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.goodId, t.courseId] }),
    goodFk: foreignKey({ columns: [t.goodId], foreignColumns: [goods.id] }).onDelete('cascade'),
    userIdx: index('idx_bags_user_id').on(t.userId),
    goodIdx: index('idx_bags_good_id').on(t.goodId),
  })
);

// ====================== Relations ======================
export const classesRelations = relations(classes, ({ many }) => ({
  classChapters: many(classChapters),
  classCourses: many(classCourses),
  classRaces: many(classRaces),
}));

export const goodsRelations = relations(goods, ({ many }) => ({
  bags: many(bags),
}));

export const bagsRelations = relations(bags, ({ one }) => ({
  good: one(goods, { fields: [bags.goodId], references: [goods.id] }),
}));
