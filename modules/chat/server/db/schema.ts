/**
 * chat module schema 片段
 *
 * 包含表：chatConversations（会话）、chatMessages（消息）
 *
 * 跨 module 外键依赖：userId → users.id（base module），
 * 与 lms 的做法一致，这里只声明 integer 列，不建 FK，避免跨模块迁移顺序问题。
 */
import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { withTimestamps } from '../../../base/server/db/schema'

/** 会话（左侧对话记录列表的一行） */
export const chatConversations = pgTable(
  'chat_conversations',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    title: varchar('title', { length: 255 }).notNull().default('New chat'),
    /** 该会话使用的模型名（仅记录，便于回溯用哪个模型聊的） */
    model: varchar('model', { length: 100 }),
    /** 置顶：列表按 pinned desc, lastMessageAt desc 排序 */
    pinned: boolean('pinned').notNull().default(false),
    messageCount: integer('message_count').notNull().default(0),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }).defaultNow(),
    ...withTimestamps,
  },
  (t) => ({
    userIdx: index('idx_chat_conversations_user_id').on(t.userId),
    lastIdx: index('idx_chat_conversations_last_message_at').on(t.lastMessageAt),
  }),
)

/** 消息 */
export const chatMessages = pgTable(
  'chat_messages',
  {
    id: serial('id').primaryKey(),
    conversationId: integer('conversation_id').notNull(),
    /** user / assistant / system / tool */
    role: varchar('role', { length: 20 }).notNull(),
    content: text('content').notNull().default(''),
    /** 深度思考模型返回的 reasoning_content */
    reasoning: text('reasoning'),
    /** 工具调用轨迹（JSON 数组，便于回看这一轮模型做了什么） */
    toolCalls: text('tool_calls'),
    model: varchar('model', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    convIdx: index('idx_chat_messages_conversation_id').on(t.conversationId),
  }),
)

/**
 * 会话工作区文件（虚拟文件系统）
 *
 * 模型看到的 /work/xxx 就是这里的一行，不是磁盘路径 —— 可审计、可回滚、
 * 能直接在右侧文件树渲染和下载，也避免给多用户系统开真实的 fs 权限。
 *
 * 只存文本（代码/markdown/csv/json/svg…）；二进制产物走 files 表另存。
 * 删除用**硬删除**，让 (conversation_id, path) 的唯一索引可用（同名文件可重建）。
 */
export const chatFiles = pgTable(
  'chat_files',
  {
    id: serial('id').primaryKey(),
    conversationId: integer('conversation_id').notNull(),
    userId: integer('user_id').notNull(),
    path: varchar('path', { length: 500 }).notNull(),
    content: text('content').notNull().default(''),
    mime: varchar('mime', { length: 100 }),
    size: integer('size').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
  },
  (t) => ({
    convIdx: index('idx_chat_files_conversation_id').on(t.conversationId),
    pathUniq: uniqueIndex('uq_chat_files_conv_path').on(t.conversationId, t.path),
  }),
)
