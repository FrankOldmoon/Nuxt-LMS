# MMO 模块代码评审报告

> 目标：班级学生在游戏中学习与互动。
> 范围：`modules/mmo`（Nuxt module + Phaser 客户端 + Colyseus 权威服务器）
> 结论：技术底座扎实（配置驱动地图/角色/任务、权威服务器、断线/存档处理都考虑到了），但**战斗系统完全未接入**，且**与"教育"目标最相关的玩法层几乎空白**。

---

## 一、总体架构（优点）

- **分层清晰**：客户端 `gamejs/`（net / game / rpg / shared / config）、服务端 `server/`（colyseus / api / db / plugins）职责分明。
- **权威服务器**：`GameRoom.ts` 用 Colyseus 维护 `players`/`groundItems`，经济（buy/sell/equip）确实在服务端结算；`persistPlayer` 每 5s + 离房落库 `game_info`。
- **配置驱动**：地图、物品、NPC、任务、怪物全在 `config/*.json`，加内容不用改代码；`maps.js`/`items.js` 提供访问层。
- **班级隔离**：`join` 一次性 token + `filterBy(["classId"])` 按 `default_class.id` 分房间，同账号踢旧会话。
- **细节到位**：出生点 2s 内忽略 `move` 防覆盖、HMR/多场景复用单连接、纹理/字体回退、`_dead` 防御残留回调崩溃等，说明踩过不少坑。

---

## 二、严重问题 / Bug（正确性）

### 1. 战斗系统完全未接入（最核心缺陷）
代码里有 `monster.js`、`onMonsterHitPlayer`、`removeMonster`、`sendKill`、`Monster.damage/attack`，但**全部是死代码**：

- **怪物从不生成**：`maps.json` 所有地图 `features.monsters` 都是 `false`（world 显式 false，其余无该字段 → 假值）。`MapScene.js:206` 的条件 `mcfg.features.monsters` 永不成立，`spawnMonsters()` 不会被调用。
- **玩家无法攻击**：输入只绑定了 `W A S D / Shift / E / B / F / T / Esc / Enter / Space`（`MapScene.js:191-199`），**没有攻击键**。`i18n.js` 的 `keys.action` 写着"J 跳跃 · K 劈砍 · L 射击 · U 施法"，但这些键根本没绑，`AnimatedCharacter.doAction` 也无人调用。
- **怪物不会攻击/受伤/死亡**：`onMonsterHitPlayer`（`MapScene.js:619`）仅定义从未被调用；`Monster.damage()`/`attack()`（`monster.js`）从未被调用；`removeMonster`（`MapScene.js:630`）因无击杀触发而永不发生。

**后果**：经验/升级、怪物掉落（loot）、除 `gem_hunter` 外的成长线全部失效；`monster.js`、`MapScene` 里大半战斗相关逻辑是装饰。`sendKill` 只有 `offline.js` 里是空操作。

### 2. `/api/mmo/state` POST 可被直接作弊
`server/api/mmo/state.post.ts` 的白名单包含 `gold / xp / level / inventory / equipped / hp / hunger …`。任何登录学生直接 `POST {"gold":9999999}` 就能改自己存档——Colyseus 虽然权威，但这个 REST 端点把数值字段写成可写，等于留后门。
**建议**：该端点只允许写 `cfg` / `name`（外观/昵称），其余字段删除白名单，只由 Colyseus 权威维护。

### 3. 服务器信任客户端战斗上报（与"权威"不符）
即便开了战斗，`GameRoom.ts` 里：
- `sendHit` 用客户端上报的 `dmg`（`GameRoom.ts:132`）
- `sendKill` 用客户端上报的 `xp`/`key`（`GameRoom.ts:141`）
- `sendLoot` 用客户端上报的 `itemId`（`GameRoom.ts:181`）

学生用任意 WebSocket 客户端伪造击杀即可刷 XP/物品。至少应：按 `MONSTER_DEFS` 表校验 `key` 与 `xp` 上限；掉落物改由服务端按 `def.drops`/`dropChance` 决定，而非客户端上报。

### 4. 冗余且可能过期的二次拉取
`MapScene.setupSelfState` 在 Colyseus 已持有 `selfP` 后，又 `fetch('/api/mmo/state')` 取一份存档坐标来 `restoreSavedMap`（`MapScene.js:307-314`）。这会与服务器权威坐标竞争，且多一次请求。直接用 `selfP.x/y/mapId` 即可，删掉这次 fetch。

### 5. 误导性 UI 文案
`i18n.js` `keys.action` = "J 跳跃 · K 劈砍 · L 射击 · U 施法"，但游戏没有这些按键绑定，玩家会困惑。应删除或真正实现。

---

## 三、性能 / 架构优化

### 6. 水面动画重绘整张地图（性能）
`rpgMap.load` 每 150ms 调用 `paint(frame)`，清空并重建**整张底图画布**（最大约 2400×2000）。应把水面单独拆成一层（独立 canvas / tilemap），静态层只画一次，只重绘水面区域。

### 7. 纹理未回收（内存泄漏）
远端玩家每次 `rebuildRemote`（换装/变外观）会新建 `r_<key>_T_*` 纹理，但旧纹理 `scene.textures.remove` 未被调用（`MapScene.js` 的 `onRemoteChange`/`rebuildRemote`、`monster.js`）。长会话 + 频繁换装会累积 GPU 纹理。应在销毁/重建前 `remove` 旧 key。

### 8. 重复代码：`tile-draw`
`gamejs/tile-draw.js` 与 `gamejs/rpg/tileDraw.js` 同名不同路径，分别被 `pages/tileset.vue` 和 `gamejs/rpg/rpgMap.js` 引用。应合并为一份，避免改一处漏一处。

### 9. 断线无处理
`colyseus.js` 只绑了 `onError` 显示错误，没 `onLeave` / 重连逻辑。Colyseus 断线（服务器热重启、网络抖动）后界面仍显示"已连接"。应加 `room.onLeave` 提示并自动重连（`joinOrCreate` 同 `classId` 即可复用房间）。

### 10. 无测试覆盖
服务端权威逻辑（任务结算 `checkAllTasks` 的迭代避免爆栈、经济 buy/sell、升级曲线）没有任何单测。权威服务器的正确性最该被测试。

---

## 四、缺失功能（重点：教育层）

### 11. 核心缺口：没有"教育"内容（与目标最大偏差）
当前是**通用 MMO**（走路 / NPC 对话 / 捡宝石 / 买卖 / 打怪），"班级学生在游戏中学习和互动"几乎未体现：

- 没有教师可**编排**的任务 / 测验 / 知识点（现有任务写死在 `config/tasks.json`，与学科无关）。
- 没有"知识问答""解题获得奖励/经验"机制。
- 没有**班级协作**（组队、共同完成课题）。
- 没有**班级排行榜 / 学习进度看板**（给老师用）。
- 没有**教师/学生角色区分**（LMS 已有 teacher 角色，但 MMO 没用上）。

**建议**：把 `tasks.json` 升级为 DB 表（按 `classId` 可编排），新增任务类型 `quiz`（含题库/答案/学科），NPC `giver`/`target` 支持 quiz；新增班级排行榜 API + 教师后台。

### 12. 无移动端 / 触屏支持
纯键盘操作。若班级用平板/iPad 上课，需要虚拟摇杆 + 触屏按钮。

### 13. NPC / 地图内容偏少
4 个 NPC、4 张地图、仅 1 个可拾取物（宝石）。教学场景往往需要更丰富的"教室 / 实验室 / 图书馆"等主题地图与对应 NPC、对话框可承载题目。

### 14. 缺少新手引导
首次进入无引导，学生不知道要干嘛（`E` 对话、`T` 任务在提示条里，但无任务引导流程）。

### 15. `gem_hunter` 任务体验差
只有 1 个宝石生成点，靠 20s 刷新凑 3 个，耗时且单调；且这是唯一 collect 类目标。

### 16. 社交/互动功能弱
没有玩家间文字聊天 / 表情气泡，"互动"只能靠同屏走动。可加局部聊天或表情。

### 17. 经济无 sink（消耗闭环）
金币只能买，没有"学习消耗"（如答题消耗体力、修复装备）形成闭环，容易通胀。

### 18. 资产加载容错
`fetch` 失败静默降级为 emoji（`MapScene.spawnGroundItem`）；地图图集任一失败会整图空白（`rpgMap` 有回退 world）。建议做加载进度 + 失败提示。

---

## 五、优先级路线

- **P0（立刻修）**
  1. 接入战斗：开 `monsters:true` + 加攻击键（如 J/K）+ 命中/死亡判定 + `removeMonster` 触发。
  2. 堵 `/api/mmo/state` 作弊（去掉数值字段白名单）。
  3. 服务器校验战斗上报（`xp`/`key` 查表、`loot` 由服务端决定）。

- **P1（近期）**
  4. 教育内容层：可编排任务 / 测验 / 班级榜 / 教师角色。
  5. 断线重连；水面性能拆分；纹理回收；合并 `tile-draw`。
  6. 服务端单测（任务结算、经济、升级）。

- **P2（增强）**
  7. 移动端虚拟摇杆；玩家聊天/表情；更多主题地图与 NPC。
  8. 新手引导；经济 sink；资产加载进度与失败提示。

---

## 附：关键文件索引
- 客户端场景/输入：`gamejs/game/scenes/MapScene.js`
- 角色渲染：`gamejs/rpg/buildMvCharacter.js`、`gamejs/game/animatedCharacter.js`
- 怪物/战斗：`gamejs/game/monster.js`（现状：未接入）
- 配置数据：`gamejs/config/{maps,items,npcs,tasks,monsters}.json`
- 权威服务器：`server/colyseus/GameRoom.ts`、`server/colyseus/schema.ts`
- REST 接口：`server/api/mmo/{join,state,reset}.post.ts`、`state.get.ts`
- 安全后门点：`server/api/mmo/state.post.ts`（数值字段可写）
- 资产服务：`server/api/game-assets/[...path].ts`、`game-assets-list.get.ts`
