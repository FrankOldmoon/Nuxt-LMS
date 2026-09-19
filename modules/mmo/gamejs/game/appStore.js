// appStore.js —— 跨场景共享状态（外观/玩家存档/Colyseus 连接等）
export const appStore = {
  result: null,          // 最近一次合成结果 { sheets, layout }
  currentCfg: null,      // 当前外观配置
  playerState: null,     // 玩家存档（来自 /api/mmo/state，用于进入游戏前的初始化）
  gameClient: null,      // net/client.js 的 GameClient 实例
  gameToken: null,       // /api/mmo/join 发放的一次性 Colyseus token
  classId: 0,            // 房间号 = 玩家 default_class.id（每人只进自己班级的房间）
  courseId: 0,           // 本次游玩绑定的课程（存档/金币按课程隔离，必填）
  netURL: "ws://localhost:2567", // Colyseus 服务端地址
  sharedNet: null,       // 复用的 NetClient（进出地图场景不重复连接）
  nav: null,             // 跨地图过渡: { to, tile } —— 目标地图键 + 出生瓦片(可选)
  selfP: null,           // 本机玩家（Colyseus 房间中的自己）
  bagTarget: null,       // 当前活跃场景（背包/金币刷新目标）
  groundTarget: null,    // 当前活跃场景（地面物品目标）
  activeScene: null,     // 当前活跃游戏场景(MapScene 实例)
  onSelfReady: null,     // 本机角色就位回调(首帧渲染前不显示画面, 避免出生点→存档坐标瞬移)
};
