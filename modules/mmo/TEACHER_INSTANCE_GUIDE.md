# 教师编排副本（Teacher Instance）使用与 JSON 规范

教师通过 `/mmo-teacher` 页面提交一份 JSON，系统据此在运行时生成**独立的副本地图**，包含
NPC、对话、怪物与任务。主 MMO 场景（`world` 等）保持通用 MMO 玩法不变，玩家从世界地图的
「副本入口」NPC 进入老师布置的副本。

## 数据流

```
老师 /mmo-teacher  ──POST /api/mmo/instances──▶  mmo_instance 表(classId 隔离)
                                                        │
玩家 世界地图「副本入口」NPC ──GET /api/mmo/instances──▶ 列出本班副本
        │ 选择进入
        ▼
instanceStore.register(json)  → 编译为 mapId "inst_<id>" 的地图配置
        │
        ▼
scene.start("inst_<id>")  → 同款 MapScene 加载副本地图 / 生成 NPC / 怪物 / 任务
```

- **服务端权威**：副本任务在 `GameRoom` 房间创建时从 `mmo_instance` 载入，与静态 `TASKS`
  合并参与 kill / collect / talk 任务结算；战斗掉落、经验由服务端在 `battleWin` 消息中结算。
- **班级隔离**：副本按 `classId` 存储与读取，学生只看到本班老师布置的副本。

## JSON 字段规范

```jsonc
{
  "id": "fire_cave",                 // 必填, 字母/数字/下划线, ≤48, 同班级唯一(重复=更新)
  "name": "火焰洞窟",                // 必填
  "description": "清剿洞窟中的怪物",  // 可选
  "map": {                          // 必填, 副本地图
    "file": "maps/Map_New_Inside.json", // 必填, 指向 assets/mmo/maps 下的地图
    "tex": "rpgInside",             // 必填, 瓦片图集 key
    "spawn": [10, 12],              // 可选, 玩家进入时的出生瓦片
    "features": { "npc": true, "monsters": true }, // 可选, 默认都开
    "doors": [                      // 可选, 出口(回主世界等)
      { "tile": [10, 14], "to": "world", "spawn": [9, 18] }
    ]
  },
  "npcs": [                         // 可选, 副本 NPC
    {
      "key": "guide",               // 唯一 key
      "name": "向导",
      "tile": [12, 14],             // 落点瓦片
      "lines": ["欢迎来到火焰洞窟。", "清掉蝙蝠再回去复命。"], // 对话
      // cfg 可选: 外观(RPG Maker MV 合成参数), 缺省用 DEFAULT_CFG
      "role": "talk"                // 可选: talk(默认) / shop
    }
  ],
  "monsters": [                     // 可选, 怪物落点(必须是 monsters.json 中存在的 key)
    { "key": "bat", "tile": [14, 18] },
    { "key": "ghost", "tile": [18, 16] }
  ],
  "tasks": [                        // 可选, 副本任务(服务端权威结算)
    {
      "id": "clear_fire",
      "name": "清剿火焰洞窟",
      "desc": "击败 3 只蝙蝠。",
      "type": "kill",               // kill / collect / talk
      "target": "bat",              // kill→怪物key / collect→物品id / talk→NPC key
      "count": 3,
      "giver": "guide",             // 可选, 由哪个 NPC 接取
      "reward": { "xp": 80, "gold": 120 }  // 可选奖励
    }
  ]
}
```

### 可用怪物 key（monsters.json）
`bat` `bee` `big_worm` `eyeball` `ghost` `man_eater_flower` `pumpking` `snake`

### 可用地图（maps.json 的 tex）
复制现有地图即可：`rpgVillage`(村口) / `rpgVillage2`(村庄二) / `rpgInside`(房间一) / `rpgInside2`(房间二)。
也可放置自己的地图 json 到 `assets/mmo/maps/` 并在 `tex` 引用对应图集。

### 任务类型
- `kill`：击败 `count` 只 `target` 指定怪物（怪物 key）。
- `collect`：拾取 `count` 个 `target` 指定物品（物品 id，如 `gem`）。
- `talk`：与 `target` 指定 NPC（key）对话 `count` 次。

## 权限
- 上传 / 删除：`requireRole(['teacher','admin'])`。
- 学生：只能查看并进入本班副本（GET 仅按 `classId` 过滤）。

## 通过链接直接加载副本（json=url 模式）

除了"教师后台上传 → 世界地图副本入口进入"这条路径，MMO 页面还支持**通过链接直接加载并进入一个副本**：

```
/mmo?json=<副本JSON的URL>
# 别名：/mmo?url=<副本JSON的URL>
```

工作流：

```
浏览器打开 /mmo?json=<url>
   │
   ▼
mmo.vue 读取 route.query.json → client.loadExternalInstance(url)
   │
   ▼
POST /api/mmo/instances/from-url  (服务端拉取该 URL 的 JSON，避开浏览器 CORS)
   │ 校验 map.file / map.tex 存在；id 自动以 ext_ 前缀持久化为本班实例
   ▼
返回 { id, name, json }
   │
   ▼
mmo.vue: instanceStore.register(json, "inst_<id>") + addRuntimeTasks(json.tasks)
   │ 直接进入该副本地图(MapScene 以 inst_<id> 为 active 场景)，world 一并注册供出口返回
   ▼
GameRoom.onJoin 重新载入本班实例任务 → 副本的 kill/collect/talk 任务权威结算、战斗掉落/经验正常
```

要点：
- **服务端拉取 JSON**：链接里的 JSON 由服务端 `fetch`，因此不受浏览器跨域限制；且服务端先校验结构再入库，保证权威结算。
- **任务权威**：外部副本同样写入 `mmo_instance`（id 带 `ext_` 前缀），`GameRoom` 在 `onJoin` 时重新载入实例任务，因此即便房间已存在也能正确结算任务、发放奖励与掉落。
- **不污染副本入口列表**：带 `ext_` 前缀的实例不会出现在世界地图"副本入口"列表与教师后台（仅用于服务端任务加载），玩家通过分享链接直接进入。
- **地图文件可远程**：`map.file` 支持绝对 `http(s)` URL（远端地图 JSON）；该 JSON 的 `tilesetId` 仍须引用服务器本地 `Tilesets.json` 中存在的图集名（图集图片为共享本地资源，随底图流水线一并加载）。NPC / 怪物立绘由 RPG Maker MV 部件本地合成，物品图标为本地资源——即"副本地图与其它所有资源"均由现有资源流水线加载。
- **返回主世界**：副本 JSON 的 `map.doors` 配置 `to: "world"` 的出口即可返回主世界。

## 相关代码
- 客户端注册表：`gamejs/shared/instanceStore.js`
- 进入方式：目前只保留 `?json=<url>` 分享链接进入（地图内的"副本入口"NPC 已按需求移除，如需恢复需重新接线）
- 链接加载入口：`pages/mmo.vue`（`route.query.json` → `client.loadExternalInstance`）
- 客户端拉取：`gamejs/net/client.js`（`loadExternalInstance`）
- 远程地图加载：`gamejs/rpg/rpgMap.js`（`load()` 支持 `map.file` 为绝对 URL）
- 回合制战斗：`gamejs/game/battle.js` + `gamejs/game/battleUI.js`
- 服务端结算：`server/colyseus/GameRoom.ts`（`battleWin` / `allTasks` 含副本任务 / `reloadInstanceTasks`）
- 接口：`server/api/mmo/instances.get.ts` · `.post.ts` · `[id].delete.ts` · `from-url.post.ts`
- 表结构：`server/db/schema.ts`（`mmoInstance`）
