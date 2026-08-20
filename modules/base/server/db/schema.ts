/**
 * base module schema（合并 auth 后的完整 schema）
 *
 * 包含表：roles, permissions, configs, rolePermissions, files,
 *         users, tokens, userRoles, userClasses, notifys, messages
 *
 * 此文件为 base+auth 合并后的完整 schema 片段。
 * root 的 server/db/schema.ts 为 @nuxthub/core 扫描入口，内容与此文件一致。
 * doc/lms 模块通过 import { withTimestamps } 引用此文件的公共 helper。
 *
 * 注意：此文件必须自包含，不能有跨 module 的相对 import（@nuxthub/core 的 bundler 无法解析）。
 */
import {
  pgTable,
  serial,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  primaryKey,
  foreignKey,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ----- 公共时间戳列（软删除 + 时间戳） -----
export const withTimestamps = {
  // 统一使用 timestamptz（withTimezone）→ Postgres 按 UTC 存储，跨时区一致
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
};

// ====================== 基础表 ======================

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
  }),
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
    userIdx: index('idx_files_user_id').on(t.userId),
  }),
);

export const classes = pgTable('classes', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 100 }).notNull().unique(),
  ...withTimestamps,
});

// ====================== 用户表（原 auth module） ======================

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
    birthday: timestamp('birthday', { withTimezone: true }),
    loginAt: timestamp('login_at', { withTimezone: true }),
    verifyAt: timestamp('verify_at', { withTimezone: true }),
    loginIp: varchar('login_ip', { length: 50 }),
    loginLocation: varchar('login_location', { length: 255 }),
    // 暴力破解防护：失败次数计数 + 锁定截止时间
    failedAttempts: integer('failed_attempts').default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    ...withTimestamps,
  },
  (t) => ({
    classIdx: index('idx_users_class_id').on(t.classId),
    classFk: foreignKey({ columns: [t.classId], foreignColumns: [classes.id] }).onDelete('set null'),
    emailIdx: index('idx_users_email').on(t.email),
    usernameIdx: index('idx_users_username').on(t.username),
  }),
);

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
  }),
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
  }),
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
    userIdx: index('idx_user_classes_user_id').on(t.userId),
    classIdx: index('idx_user_classes_class_id').on(t.classId),
  }),
);

export const notifys = pgTable(
  'notifications',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    content: jsonb('content'),
    data: jsonb('data'),
    userId: integer('user_id').notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    ...withTimestamps,
  },
  (t) => ({
    userFk: foreignKey({ columns: [t.userId], foreignColumns: [users.id] }).onDelete('cascade'),
    userIdx: index('idx_notifications_user_id').on(t.userId),
  }),
);

export const messages = pgTable(
  'messages',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    content: jsonb('content'),
    senderUserId: integer('sender_user_id').notNull(),
    receiverUserId: integer('receiver_user_id').notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    ...withTimestamps,
  },
  (t) => ({
    senderFk: foreignKey({ columns: [t.senderUserId], foreignColumns: [users.id], name: 'msg_sender' }).onDelete('cascade'),
    receiverFk: foreignKey({ columns: [t.receiverUserId], foreignColumns: [users.id], name: 'msg_receiver' }).onDelete('cascade'),
    senderIdx: index('idx_messages_sender').on(t.senderUserId),
    receiverIdx: index('idx_messages_receiver').on(t.receiverUserId),
  }),
);

// ====================== 用户反馈 ======================
export const feedbacks = pgTable(
  'feedbacks',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    type: varchar('type', { length: 30 }).notNull().default('suggestion'),
    content: jsonb('content'),
    userId: integer('user_id').notNull(),
    ...withTimestamps,
  },
  (t) => ({
    userFk: foreignKey({ columns: [t.userId], foreignColumns: [users.id] }).onDelete('cascade'),
    userIdx: index('idx_feedbacks_user_id').on(t.userId),
  }),
);

// ====================== Relations ======================

export const usersRelations = relations(users, ({ one, many }) => ({
  userRoles: many(userRoles),
  tokens: many(tokens),
  userClasses: many(userClasses),
  notifications: many(notifys),
  sendMessages: many(messages, { relationName: 'msg_sender' }),
  receiveMessages: many(messages, { relationName: 'msg_receiver' }),
  feedbacks: many(feedbacks),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  userRoles: many(userRoles),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));
