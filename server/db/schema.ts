import {
  pgTable,
  serial,
  varchar,
  text,
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

// ----- 公共时间戳列（软删除 + 时间戳） -----
const withTimestamps = {
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp('deleted_at'),
};

// ====================== 基础表（无外键依赖或仅依赖更早定义的表） ======================

export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 100 }).notNull().unique(),
  ...withTimestamps,
});

export const permissions = pgTable('permissions', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 100 }).notNull().unique(),
  ...withTimestamps,
});

export const configs = pgTable('configs', {
  id: varchar('id', { length: 100 }).primaryKey(),
  order: integer('order'),
  value: jsonb('value'),
  ...withTimestamps,
});

export const classes = pgTable('classes', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 100 }).notNull().unique(),
  ...withTimestamps,
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 100 }),
  order: integer('order').default(0),
  orders: jsonb('orders').default('[]'),
  ...withTimestamps,
});

// ====================== 用户表（被后续表广泛引用） ======================
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    username: varchar('username', { length: 255 }).notNull().unique(),
    password: varchar('password', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    preferName: varchar('prefer_name', { length: 255 }),
    avatarImg: varchar('avatar_img', { length: 500 }),
    englishName: varchar('english_name', { length: 255 }),
    gender: varchar('gender', { length: 50 }),
    rollNumber: varchar('roll_number', { length: 255 }),
    email: varchar('email', { length: 255 }).unique(),
    telephone: varchar('telephone', { length: 50 }),
    strongPwd: boolean('strong_pwd').default(false),
    pwdQuestions: jsonb('pwd_questions'),
    classId: integer('class_id'),
    defaultClass: jsonb('default_class'),
    defaultLocale: varchar('default_locale', { length: 20 }).default('zh-CN'),
    birthday: timestamp('birthday'),
    loginAt: timestamp('login_at'),
    verifyAt: timestamp('verify_at'),
    loginIp: varchar('login_ip', { length: 50 }),
    loginLocation: varchar('login_location', { length: 255 }),
    ...withTimestamps,
  },
  (t) => ({
    classFk: foreignKey({ columns: [t.classId], foreignColumns: [classes.id] }).onDelete('set null'), // 保留班级但不建议级联删除用户
    classIdx: index('idx_users_class_id').on(t.classId),
    emailIdx: index('idx_users_email').on(t.email),
    usernameIdx: index('idx_users_username').on(t.username), // 用户名查询高频
  })
);

// ----- 依赖 users 的表移到 users 之后 -----
export const tokens = pgTable(
  'tokens',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }),
    userId: integer('user_id').notNull(),
    ...withTimestamps,
  },
  (t) => ({
    userFk: foreignKey({ columns: [t.userId], foreignColumns: [users.id] }).onDelete('cascade'),
    userIdx: index('idx_tokens_user_id').on(t.userId),
  })
);

export const userRoles = pgTable(
  'user_roles',
  {
    userId: integer('user_id').notNull(),
    roleId: integer('role_id').notNull(),
    ...withTimestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.roleId] }),
    userFk: foreignKey({ columns: [t.userId], foreignColumns: [users.id] }).onDelete('cascade'),
    roleFk: foreignKey({ columns: [t.roleId], foreignColumns: [roles.id] }).onDelete('cascade'),
    userRoleIdx: index('idx_user_roles_user_role').on(t.userId, t.roleId),
  })
);

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: integer('role_id').notNull(),
    permissionId: integer('permission_id').notNull(),
    ...withTimestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.roleId, t.permissionId] }),
    roleFk: foreignKey({ columns: [t.roleId], foreignColumns: [roles.id] }).onDelete('cascade'),
    permFk: foreignKey({ columns: [t.permissionId], foreignColumns: [permissions.id] }).onDelete('cascade'),
  })
);

export const userClasses = pgTable(
  'user_classes',
  {
    userId: integer('user_id').notNull(),
    classId: integer('class_id').notNull(),
    isTeacher: boolean('is_teacher'),
    ...withTimestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.classId] }),
    userFk: foreignKey({ columns: [t.userId], foreignColumns: [users.id] }).onDelete('cascade'),
    classFk: foreignKey({ columns: [t.classId], foreignColumns: [classes.id] }).onDelete('cascade'),
    userIdx: index('idx_user_classes_user_id').on(t.userId),
    classIdx: index('idx_user_classes_class_id').on(t.classId),
  })
);

export const notifys = pgTable(
  'notifications', // 表名改为 notifications
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    content: jsonb('content'),
    data: jsonb('data'),
    userId: integer('user_id').notNull(),
    readAt: timestamp('read_at'),
    ...withTimestamps,
  },
  (t) => ({
    userFk: foreignKey({ columns: [t.userId], foreignColumns: [users.id] }).onDelete('cascade'),
    userIdx: index('idx_notifications_user_id').on(t.userId),
  })
);

export const messages = pgTable(
  'messages',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    content: jsonb('content'),
    senderUserId: integer('sender_user_id').notNull(),
    receiverUserId: integer('receiver_user_id').notNull(),
    readAt: timestamp('read_at'),
    ...withTimestamps,
  },
  (t) => ({
    senderFk: foreignKey({ columns: [t.senderUserId], foreignColumns: [users.id], name: 'msg_sender' }).onDelete('cascade'),
    receiverFk: foreignKey({ columns: [t.receiverUserId], foreignColumns: [users.id], name: 'msg_receiver' }).onDelete('cascade'),
    senderIdx: index('idx_messages_sender').on(t.senderUserId),
    receiverIdx: index('idx_messages_receiver').on(t.receiverUserId),
  })
);

export const files = pgTable(
  'files',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    hash: varchar('hash', { length: 255 }).notNull(),
    path: varchar('path', { length: 500 }).notNull().unique(),
    type: varchar('type', { length: 100 }),
    userId: integer('user_id'),
    size: integer('size'),
    group: varchar('group', { length: 100 }),
    ...withTimestamps,
  },
  (t) => ({
    userFk: foreignKey({ columns: [t.userId], foreignColumns: [users.id] }).onDelete('set null'),
    userIdx: index('idx_files_user_id').on(t.userId),
  })
);

export const medals = pgTable('medals', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  content: jsonb('content'),
  ...withTimestamps,
});

export const userMedals = pgTable(
  'user_medals', // 统一复数
  {
    userId: integer('user_id').notNull(),
    medalId: integer('medal_id').notNull(),
    ...withTimestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.medalId] }),
    userFk: foreignKey({ columns: [t.userId], foreignColumns: [users.id] }).onDelete('cascade'),
    medalFk: foreignKey({ columns: [t.medalId], foreignColumns: [medals.id] }).onDelete('cascade'),
    userIdx: index('idx_user_medals_user_id').on(t.userId),
    medalIdx: index('idx_user_medals_medal_id').on(t.medalId),
  })
);

// ====================== 课程相关表（依赖 courses 及其上层） ======================
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
    authorFk: foreignKey({ columns: [t.userId], foreignColumns: [users.id] }).onDelete('set null'),
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
    courseFk: foreignKey({ columns: [t.courseId], foreignColumns: [courses.id] }).onDelete('cascade'),
    classFk: foreignKey({ columns: [t.classId], foreignColumns: [classes.id] }).onDelete('set null'),
    courseIdx: index('idx_announcements_course_id').on(t.courseId),
    classIdx: index('idx_announcements_class_id').on(t.classId),
  })
);

// ====================== 教学内容表（复合主键 course_id + cid） ======================
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
    courseFk: foreignKey({ columns: [t.courseId], foreignColumns: [courses.id] }).onDelete('cascade'),
    courseIdx: index('idx_questions_course_id').on(t.courseId),
    typeIdx: index('idx_questions_type').on(t.type), // 按题型查询频繁
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
    courseFk: foreignKey({ columns: [t.courseId], foreignColumns: [courses.id] }).onDelete('cascade'),
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
    startAt: timestamp('start_at'),
    endAt: timestamp('end_at'),
    avgPoint: numeric('avg_point', { precision: 10, scale: 2 }).default('0'),
    point: integer('point').default(100),
    extra: jsonb('extra'),
    tags: jsonb('tags'),
    ...withTimestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.courseId, t.cid] }),
    courseFk: foreignKey({ columns: [t.courseId], foreignColumns: [courses.id] }).onDelete('cascade'),
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
    courseFk: foreignKey({ columns: [t.courseId], foreignColumns: [courses.id] }).onDelete('cascade'),
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
    courseFk: foreignKey({ columns: [t.courseId], foreignColumns: [courses.id] }).onDelete('cascade'),
    userFk: foreignKey({ columns: [t.userId], foreignColumns: [users.id] }).onDelete('cascade'),
    // 修复自引用外键：必须与复合主键匹配，保证父评论在同一课程内
    parentFk: foreignKey({
      columns: [t.courseId, t.parentId],
      foreignColumns: [t.courseId, t.cid],
    }).onDelete('set null'),
    userIdx: index('idx_comments_user_id').on(t.userId),
    parentIdx: index('idx_comments_parent').on(t.courseId, t.parentId),
  })
);

// ====================== 用户行为中间表（统一复数，补齐索引） ======================
export const userChapters = pgTable(
  'user_chapters', // 复数
  {
    userId: integer('user_id').notNull(),
    chapterId: integer('chapter_id').notNull(),
    score: numeric('score', { precision: 8, scale: 2 }).default('0'),
    selfScore: jsonb('self_score'),
    taskStatus: jsonb('task_status'),
    isPass: boolean('is_pass').default(false),
    readTime: integer('read_time').default(0),
    ...withTimestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.chapterId] }),
    userFk: foreignKey({ columns: [t.userId], foreignColumns: [users.id] }).onDelete('cascade'),
    chapterFk: foreignKey({ columns: [t.chapterId], foreignColumns: [chapters.id] }).onDelete('cascade'),
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
    userFk: foreignKey({ columns: [t.userId], foreignColumns: [users.id] }).onDelete('cascade'),
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
    raceScore: numeric('race_score', { precision: 10, scale: 2 }).default('0'),
    marksScore: numeric('marks_score', { precision: 10, scale: 2 }).default('0'),
    questionScore: numeric('question_score', { precision: 10, scale: 2 }).default('0'),
    quizScore: numeric('quiz_score', { precision: 10, scale: 2 }).default('0'),
    homeworkScore: numeric('homework_score', { precision: 10, scale: 2 }).default('0'),
    commentScore: numeric('comment_score', { precision: 10, scale: 2 }).default('0'),
    extraScore: numeric('extra_score', { precision: 10, scale: 2 }).default('0'),
    abilities: jsonb('abilities'),
    records: jsonb('records'),
    number: varchar('number', { length: 100 }),
    group: varchar('group', { length: 100 }),
    exp: integer('exp').default(0),
    ...withTimestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.courseId] }),
    userFk: foreignKey({ columns: [t.userId], foreignColumns: [users.id] }).onDelete('cascade'),
    courseFk: foreignKey({ columns: [t.courseId], foreignColumns: [courses.id] }).onDelete('cascade'),
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
    score: numeric('score', { precision: 10, scale: 2 }), // 改为 numeric
    record: jsonb('record'),
    files: jsonb('files'),
    comment: jsonb('comment'),
    ...withTimestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.courseId, t.homeworkCid] }),
    userFk: foreignKey({ columns: [t.userId], foreignColumns: [users.id] }).onDelete('cascade'),
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
    userFk: foreignKey({ columns: [t.userId], foreignColumns: [users.id] }).onDelete('cascade'),
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
    userFk: foreignKey({ columns: [t.userId], foreignColumns: [users.id] }).onDelete('cascade'),
    raceFk: foreignKey({ columns: [t.courseId, t.raceCid], foreignColumns: [races.courseId, races.cid] }).onDelete('cascade'),
    userIdx: index('idx_user_races_user_id').on(t.userId),
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
    startedAt: timestamp('started_at'),
    submitedAt: timestamp('submited_at'),
    ...withTimestamps,
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.courseId, t.quizCid] }),
    userFk: foreignKey({ columns: [t.userId], foreignColumns: [users.id] }).onDelete('cascade'),
    quizFk: foreignKey({ columns: [t.courseId, t.quizCid], foreignColumns: [quizzes.courseId, quizzes.cid] }).onDelete('cascade'),
    userIdx: index('idx_user_quizzes_user_id').on(t.userId),
  })
);

// ====================== 班级关联表（统一 class 命名，添加索引） ======================
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
    chapterFk: foreignKey({ columns: [t.chapterId], foreignColumns: [chapters.id] }).onDelete('cascade'),
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
    courseFk: foreignKey({ columns: [t.courseId], foreignColumns: [courses.id] }).onDelete('cascade'),
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
    lastQuestionStartedAt: timestamp('last_question_started_at'),
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
    chapterFk: foreignKey({ columns: [t.chapterId], foreignColumns: [chapters.id] }).onDelete('cascade'),
    userFk: foreignKey({ columns: [t.userId], foreignColumns: [users.id] }).onDelete('cascade'),
    chapterIdx: index('idx_activities_chapter_id').on(t.chapterId),
    userIdx: index('idx_activities_user_id').on(t.userId),
  })
);

// ====================== Relations 关联（名称与表名一致） ======================
export const usersRelations = relations(users, ({ one, many }) => ({
  bindClass: one(classes, { fields: [users.classId], references: [classes.id] }),
  userRoles: many(userRoles),
  tokens: many(tokens),
  userClasses: many(userClasses),
  notifications: many(notifys), // 关系名对应表变量 notifys（表仍叫 notifications，但变量名为 notifys，可统一）
  sendMessages: many(messages, { relationName: 'msg_sender' }),
  receiveMessages: many(messages, { relationName: 'msg_receiver' }),
  uploadFiles: many(files),
  chapters: many(chapters),
  userChapters: many(userChapters),
  userQuestions: many(userQuestions),
  userCourses: many(userCourses),
  userHomeworks: many(userHomeworks),
  userComments: many(userComments),
  userRaces: many(userRaces),
  userQuizzes: many(userQuizzes),
  userMedals: many(userMedals),
  activities: many(activities),
  courseComments: many(comments),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  userRoles: many(userRoles),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const classesRelations = relations(classes, ({ many }) => ({
  defaultUser: many(users),
  userClasses: many(userClasses),
  classChapters: many(classChapters),
  classCourses: many(classCourses),
  classRaces: many(classRaces),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  courses: many(courses),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  category: one(categories, { fields: [courses.categoryId], references: [categories.id] }),
  chapters: many(chapters),
  chapterVersions: many(chapterVersions),
  courseVersions: many(courseVersions),
  announcements: many(announcements),
  questions: many(questions),
  homeworks: many(homeworks),
  quizzes: many(quizzes),
  races: many(races),
  comments: many(comments),
  userCourses: many(userCourses),
  classCourses: many(classCourses),
}));

export const chaptersRelations = relations(chapters, ({ one, many }) => ({
  course: one(courses, { fields: [chapters.courseId], references: [courses.id] }),
  author: one(users, { fields: [chapters.userId], references: [users.id] }),
  versions: many(chapterVersions),
  userChapters: many(userChapters),
  classChapters: many(classChapters),
  activities: many(activities),
}));