// schema.ts —— Colyseus Schema：同步玩家位置/朝向/动画/外观/金币/背包/装备/任务 + 地面物品
// 与客户端 colyseus.js 的 auto-schema 解码兼容（players 用 ArraySchema）。
// 注：金币与课程 user_courses.coin 同源，进入房间时由服务端从课程余额初始化；
//     体力(饱食度)已移除，玩家只有生命/经验/等级。
import { Schema, ArraySchema, MapSchema, defineTypes } from "@colyseus/schema";

export class Player extends Schema {}
defineTypes(Player, {
  sessionId: "string",
  x: "number",
  y: "number",
  facing: "number",
  mode: "string",
  cfgJSON: "string",       // 外观配置(JSON 字符串)
  name: "string",
  gold: "number",          // 金币
  inventoryJSON: "string", // 背包 {itemId: 数量} 的 JSON 字符串
  equippedJSON: "string",  // 已穿戴装备 {slot: itemId} 的 JSON 字符串
  tasksJSON: "string",     // 任务状态 {taskId: {progress, done}} 的 JSON 字符串
  mapId: "string",         // 所在地图: world / indoor / indoor2 … (对应 config/maps.json)
  hp: "number", maxHp: "number",
  xp: "number", level: "number",
});

export class GroundItem extends Schema {}
defineTypes(GroundItem, {
  id: "string",
  itemId: "string",
  x: "number",
  y: "number",
  mapId: "string", // 所在地图 mapId(地面物品按地图各自渲染)
});

export class GameRoomState extends Schema {
  constructor() {
    super();
    this.players = new ArraySchema();
    this.groundItems = new ArraySchema();
    this.monsterLocks = new MapSchema(); // 怪物战斗锁: monsterId -> sessionId(谁正在与它战斗)
  }
}
defineTypes(GameRoomState, {
  players: { array: Player },
  groundItems: { array: GroundItem },
  monsterLocks: { map: "string" },
});
