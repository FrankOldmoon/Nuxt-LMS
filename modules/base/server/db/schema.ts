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
    // 佩戴的头像框（'bronze' | 'silver' | 'gold'，null=未佩戴）
    avatarFrame: varchar('avatar_frame', { length: 50 }),
    englishName: varchar('english_name', { length: 255 }),
    gender: varchar('gender', { length: 50 }),
    rollNumber: varchar('roll_number', { length: 255 }),
    email: varchar('email', { length: 255 }).unique(),
    telephone: varchar('telephone', { length: 50 }),
    strongPwd: boolean('strong_pwd').default(false),
    pwdQuestions: jsonb('pwd_questions'),
    classId: integer('class_id'),
    defaultClass: jsonb('default_class'),
    defaultLocale: varchar('default_locale', { length: 20 }),
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

/**
 * 全局广播通知主表（两层方案的第一层）
 * - 管理员发一次广播 → 这里 1 行（内容/发送者/送达人数快照）
 * - 每人一条明细存在 notifications（第二层），明细带 broadcastId 与各自的 readAt
 *   → 管理员由此可统计每条广播的送达数 / 已读数 / 阅读率
 */
export const broadcasts = pgTable('broadcasts', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  content: jsonb('content'),
  /** 发送者（管理员）用户 id */
  createdBy: integer('created_by'),
  /** 发送时的送达人数快照（fan-out 出的明细行数） */
  audience: integer('audience').default(0),
  ...withTimestamps,
});

export const notifys = pgTable(
  'notifications',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    content: jsonb('content'),
    data: jsonb('data'),
    userId: integer('user_id').notNull(),
    /**
     * 所属广播（第一层 broadcasts.id）：
     * - 全局广播：多行共享同一 broadcastId，读后写 readAt（保留用于阅读率统计）
     * - 个人定向通知（作业评分 / 评论过审等）：为 null，用户读后直接硬删除
     */
    broadcastId: integer('broadcast_id'),
    readAt: timestamp('read_at', { withTimezone: true }),
    ...withTimestamps,
  },
  (t) => ({
    userFk: foreignKey({ columns: [t.userId], foreignColumns: [users.id] }).onDelete('cascade'),
    userIdx: index('idx_notifications_user_id').on(t.userId),
    broadcastFk: foreignKey({ columns: [t.broadcastId], foreignColumns: [broadcasts.id] }).onDelete('cascade'),
    broadcastIdx: index('idx_notifications_broadcast_id').on(t.broadcastId),
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

// ====================== OAuth / SSO ======================

/**
 * 允许通过 LMS 登录的第三方系统（OAuth client 注册表）
 *
 * 一个 client 对应一个外部系统（Hydro OJ / Vision / ...）。
 * clientSecret 存 hashPassword() 的结果，不存明文。
 * redirectUris 必须是完整地址数组，回调时精确比对（禁止前缀匹配，防开放重定向）。
 */
export const oauthClients = pgTable('oauth_clients', {
  id: serial('id').primaryKey(),
  clientId: varchar('client_id', { length: 64 }).notNull().unique(),
  clientSecret: varchar('client_secret', { length: 255 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  redirectUris: jsonb('redirect_uris').notNull(),
  enabled: boolean('enabled').default(true).notNull(),
  ...withTimestamps,
});

/**
 * 一次性授权码
 *
 * 有效期 60 秒，换取 access_token 时立即标记 used。
 * 复用 tokens 表存 access_token，不另建会话表。
 */
export const oauthCodes = pgTable(
  'oauth_codes',
  {
    // generateToken() = randomBytes(32).toString('hex') = 64 字符
    code: varchar('code', { length: 128 }).primaryKey(),
    clientId: varchar('client_id', { length: 64 }).notNull(),
    userId: integer('user_id').notNull(),
    redirectUri: varchar('redirect_uri', { length: 500 }).notNull(),
    // OIDC nonce：授权请求带了就存，换 token 时原样放进 id_token 供客户端校验
    nonce: varchar('nonce', { length: 128 }),
    // PKCE code_challenge（S256）：换 token 时校验 code_verifier
    codeChallenge: varchar('code_challenge', { length: 128 }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    used: boolean('used').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    userFk: foreignKey({ columns: [t.userId], foreignColumns: [users.id] }).onDelete('cascade'),
    expireIdx: index('idx_oauth_codes_expires').on(t.expiresAt),
    clientIdx: index('idx_oauth_codes_client').on(t.clientId),
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
