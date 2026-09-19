/**
 * MMO 无头集成测试公共脚手架
 *
 * - 起真实 Colyseus 服务器（随机端口，与线上同一套房间逻辑/schema 编解码）
 * - 用内存实现替换 GameRoom 的数据库访问方法（无需 PostgreSQL / Nitro）
 * - Node 里用 colyseus.js 多客户端连接 + 轮询断言工具
 *
 * 各测试文件在 beforeAll 调 bootServer()、afterAll 调 shutdownServer()、
 * beforeEach 调 resetStore()、afterEach 调 leaveAll()。
 */
import http from "node:http";
import colyseus from "colyseus";
import * as ColyseusClient from "colyseus.js";
import { GameRoom } from "../../server/colyseus/GameRoom";

const { Server } = colyseus as any;

// ---------- 内存版"数据库" ----------
export const users = new Map<number, { id: number; name: string; classId: number }>();
export const tokens = new Map<string, number>();
// 存档按 (用户, 课程) 隔离：键 `${userId}:${courseId}`；课程金币单独存一份
// （与生产一致：游戏金币就是该课程的 user_courses.coin）
export const saves = new Map<string, any>();
export const courseCoins = new Map<string, number>(); // 键不存在 = 该用户不是这门课的成员
export const DEFAULT_COURSE = 1;
const ck = (userId: number, courseId: number) => `${userId}:${courseId}`;
export const saveOf = (userId: number, courseId: number = DEFAULT_COURSE) => saves.get(ck(userId, courseId));
export function grantCourse(userId: number, courseId: number = DEFAULT_COURSE, coin = 100) {
  courseCoins.set(ck(userId, courseId), coin);
}
// 直接播种某课程的存档（不建立连接），用于验证"同一用户多课程各自独立"
export function seedSave(userId: number, courseId: number = DEFAULT_COURSE, data: any = {}) {
  saves.set(ck(userId, courseId), { ...defaultSave("user" + userId), ...data });
}

export function defaultSave(name: string) {
  return {
    name, cfg: {}, gold: 100, inventory: {}, equipped: {}, tasks: {},
    x: 100, y: 100, facing: 2, mode: "idle", mapId: "world",
    hp: 100, maxHp: 100, xp: 0, level: 1,
  };
}

const P = GameRoom.prototype as any;
// 一次性 token：用后即删（与生产语义一致）
P.authenticate = async (token: string) => {
  const uid = tokens.get(token);
  if (uid === undefined) return null;
  tokens.delete(token);
  return uid;
};
P.userBaseInfo = async (userId: number) => {
  const u = users.get(userId);
  return u ? { classId: u.classId, name: u.name } : null;
};
// 课程成员校验 + 金币读取：null = 非成员（onJoin 会拒绝）
P.courseInfo = async (userId: number, courseId: number) => {
  const k = ck(userId, courseId);
  return courseCoins.has(k) ? courseCoins.get(k)! : null;
};
P.persistCoin = async (userId: number, courseId: number, coin: number) => {
  courseCoins.set(ck(userId, courseId), coin);
};
P.loadSave = async (userId: number, courseId: number = DEFAULT_COURSE) =>
  saves.get(ck(userId, courseId)) ?? defaultSave("玩家");
P.persistPlayer = async function (p: any) {
  const uid = this.userBySession.get(p.sessionId);
  if (!uid) return;
  const cid = this.courseBySession.get(p.sessionId) ?? DEFAULT_COURSE;
  saves.set(ck(uid, cid), {
    name: p.name, cfg: JSON.parse(p.cfgJSON || "{}"), gold: p.gold,
    inventory: JSON.parse(p.inventoryJSON || "{}"),
    equipped: JSON.parse(p.equippedJSON || "{}"),
    tasks: JSON.parse(p.tasksJSON || "{}"),
    x: p.x, y: p.y, facing: p.facing, mode: p.mode, mapId: p.mapId,
    hp: p.hp, maxHp: p.maxHp, xp: p.xp, level: p.level,
  });
  // 金币写回课程（生产里由 flushCoin → persistCoin 完成）
  courseCoins.set(ck(uid, cid), p.gold);
};
P.reloadInstanceTasks = async () => {};

// ---------- 服务器生命周期 ----------
let httpServer: http.Server;
let gameServer: any;
let port = 0;
const rooms: any[] = [];

export async function bootServer() {
  httpServer = http.createServer();
  gameServer = new Server({ server: httpServer });
  gameServer.define("game", GameRoom).filterBy(["classId"]);
  await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", () => resolve()));
  port = (httpServer.address() as any).port;
}

export async function shutdownServer() {
  await leaveAll();
  try { await gameServer?.gracefullyShutdown(false); } catch { /* ignore */ }
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
}

export function resetStore() { users.clear(); tokens.clear(); saves.clear(); courseCoins.clear(); }

export async function leaveAll() {
  while (rooms.length) {
    const r = rooms.pop();
    // 已 leave 的房间再调 leave 可能不 resolve，加超时兜底
    try { await Promise.race([r.leave(), sleep(2000)]); } catch { /* ignore */ }
  }
}

// 显式离开某房间（先从待清理列表移除，避免 afterEach 二次 leave 卡住）
export async function leaveRoom(room: any) {
  const i = rooms.indexOf(room);
  if (i >= 0) rooms.splice(i, 1);
  try { await room.leave(); } catch { /* ignore */ }
}

// ---------- 客户端连接 ----------
function newClient() {
  return new ColyseusClient.Client(`ws://127.0.0.1:${port}`);
}

// 低级连接：classIdOption 用于 matchmaking；可与用户真实班级不同（测踢人）
export async function connect(classIdOption: number, payload: { name?: string; token: string; courseId?: number }) {
  const room: any = await newClient().joinOrCreate("game", {
    name: payload.name ?? "", cfg: {}, token: payload.token, classId: classIdOption,
    courseId: payload.courseId ?? DEFAULT_COURSE,
  });
  rooms.push(room);
  return room;
}

// 期望被服务端拒绝（join 抛错）——用于班级不匹配等场景
export function connectExpectingReject(classIdOption: number, payload: { name?: string; token: string; courseId?: number }) {
  return newClient().joinOrCreate("game", {
    name: payload.name ?? "", cfg: {}, token: payload.token, classId: classIdOption,
    courseId: payload.courseId ?? DEFAULT_COURSE,
  });
}

// 首次加入：注册用户 + 授予课程成员(含初始金币) + 发放一次性 token + 播种存档
export async function join(userId: number, classId: number, seed: any = {}) {
  const name = "user" + userId;
  const courseId = Number(seed.courseId) || DEFAULT_COURSE;
  users.set(userId, { id: userId, name, classId });
  grantCourse(userId, courseId, Number(seed.coin ?? 100));
  const token = `tok_${userId}`;
  tokens.set(token, userId);
  saves.set(ck(userId, courseId), { ...defaultSave(name), ...seed });
  return connect(classId, { name, token, courseId });
}

// 重连：用户已存在，只发新 token，不重置存档/课程金币（验证存档恢复）
export async function rejoin(userId: number, classId: number, courseId: number = DEFAULT_COURSE) {
  const name = "user" + userId;
  users.set(userId, { id: userId, name, classId });
  const token = `tok_${userId}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  tokens.set(token, userId);
  return connect(classId, { name, token, courseId });
}

// ---------- 断言工具 ----------
export const players = (room: any) => Array.from(room.state.players as any) as any[];
export const mirror = (room: any, sid: string) => players(room).find((p) => p.sessionId === sid);
export const count = (room: any) => players(room).length;

export async function waitFor(fn: () => boolean, ms = 8000, step = 25): Promise<boolean> {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (fn()) return true;
    await new Promise((r) => setTimeout(r, step));
  }
  return fn();
}

export async function waitPlayers(room: any, n: number, ms = 8000) {
  const ok = await waitFor(() => count(room) >= n, ms);
  if (!ok) throw new Error(`期望房间内 ${n} 名玩家，实际 ${count(room)}`);
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const MOVE_GUARD_MS = 2200; // 服务端 join 后 2s 内忽略 move

// 每个用例分配全新 id / classId，避免测试间复用房间
let seq = 0;
export const nextUserId = () => 100000 + ++seq;
export const nextClassId = () => 700000 + ++seq;
