/**
 * mmo module schema 片段
 *
 * 包含表：game_info（MMO 玩家存档）
 *
 * 跨 module 外键依赖：
 * - game_info.userId → users.id（base module）
 * 聚合时由 base 解析跨 module 引用。
 */
import {
  pgTable,
  serial,
  varchar,
  integer,
  jsonb,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { withTimestamps } from '../../../base/server/db/schema';

// ====================== MMO 游戏存档（game_info） ======================
// 每"玩家 × 课程"一行，存储其在该课程 MMO 世界中的游戏数据：
// 外观 / 背包 / 装备 / 位置 / 朝向 / 状态(生命·经验·等级) / 任务进度
// 注意：金币不在本表，统一使用 user_courses.coin（见 lms 模块），
//       因此一门课程的金币在 LMS 课程商店与 MMO 内是同一份。
export const gameInfo = pgTable(
  'game_info',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    courseId: integer('course_id').notNull().default(0),
    name: varchar('name', { length: 50 }).default('玩家'),
    // 外观配置 {body, skin, hair, hairColor, top, topColor, cloth, shoes, expr}
    cfg: jsonb('cfg').default({}),
    gold: integer('gold').default(300),
    // 背包 {itemId: 数量}
    inventory: jsonb('inventory').default({}),
    // 已穿戴装备 {slot: itemId}
    equipped: jsonb('equipped').default({}),
    // 位置与朝向
    x: integer('x').default(1600),
    y: integer('y').default(1248),
    facing: integer('facing').default(2),
    mode: varchar('mode', { length: 20 }).default('idle'),
    mapId: varchar('map_id', { length: 64 }).default('world'),
    // 状态
    hp: integer('hp').default(100),
    maxHp: integer('max_hp').default(100),
    xp: integer('xp').default(0),
    level: integer('level').default(1),
    // 任务进度 {taskId: {progress, done}}
    tasks: jsonb('tasks').default({}),
    ...withTimestamps,
  },
  (t) => ({
    userIdx: index('idx_game_info_user_id').on(t.userId),
    userCourseUniq: unique('uniq_game_info_user_course').on(t.userId, t.courseId),
  })
);

// ====================== 教师编排副本（mmo_instance） ======================
// 每个副本一行: 由老师提交 JSON 定义, 按班级隔离(classId)。
// json 字段保存完整副本定义(地图/NPC/对话/怪物/任务), 运行时编译为独立 mapId("inst_<id>")。
export const mmoInstance = pgTable(
  'mmo_instance',
  {
    id: varchar('id', { length: 64 }).primaryKey(), // 副本 id(教师定义, 同班级唯一)
    classId: integer('class_id').notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    description: varchar('description', { length: 500 }),
    json: jsonb('json').notNull(), // 完整副本 JSON 定义
    createdBy: integer('created_by'),
    ...withTimestamps,
  },
  (t) => ({
    classIdx: index('idx_mmo_instance_class').on(t.classId),
  })
);
