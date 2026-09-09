%%%%% GG1
## 🎮 走进游戏开发

做游戏是最快乐的学习方式：**你写的每一行代码都会动起来**。🎮

这门课用 **Phaser**（2D 引擎）和 **Babylon.js**（3D 引擎）各做一个完整小游戏，全程 **AI Agent 结对**：你出创意和审查，Agent 出代码。

%%GA1%%

%%%%% W1
## 🕹️ 游戏开发全景

### 🧊 游戏的三要素

每个游戏（不管多复杂）都由三部分组成：

- 🎬 **场景（Scene）** — 游戏的一个"屏幕"：开始菜单、关卡、结束页
- 🔁 **游戏循环（Game Loop）** — 每秒 60 次：**读输入 → 更新状态 → 画一帧**（update 循环）
- 🎨 **资源（Assets）** — 图片、音效、字体、地图数据

### 🆚 2D vs 3D

| | 🟦 Phaser（2D） | 🟨 Babylon.js（3D） |
| --- | --- | --- |
| 视角 | 横版 / 顶视 | 全 3D 自由视角 |
| 上手难度 | 低，API 直观 | 中，多出相机/光照/材质概念 |
| 适合 | 平台跳跃、弹幕、解谜 | 3D 探索、驾驶、模拟 |
| 渲染 | Canvas / WebGL | WebGL / WebGPU |

:::callout icon=💡
两者都跑在浏览器里（WebGL），不用装任何软件 —— 写完发个链接就能玩，非常适合课程作品。
:::

%%W1A%%

%%W1B%%

%%%%% W2
## 🧰 选型与项目规划

### 🗺️ 本课路线

1. 🟦 **Phaser 通关**：核心概念 → 做一个**横版平台跳跃**（跳跃、金币、怪物、计分）
2. 🟨 **Babylon 通关**：核心概念 → 做一个 **3D 收集游戏**（场景漫步、捡宝石、计分）
3. 🤖 **Agent 工作流**贯穿：每个功能都是「你描述 → Agent 生成 → 你试玩审查」

### 🎯 怎么向 Agent 描述一个游戏？

游戏需求 = **玩法 + 美术 + 数值**：

> 🎯 玩法：角色左右移动 + 跳跃，踩到怪物消灭，碰到金币 +10
> 🎨 美术：先用纯色方块占位，后续再换素材
> 🔢 数值：移动速度 200px/s，跳跃 -500，重力 1200

:::callout icon=💡
数值写清楚，Agent 一次就能调出"手感差不多"的版本 —— 手感不对时，你只需要说"跳得再高一点"，改的就是那个 -500。
:::

%%W2A%%

%%W2B%%

%%%%% W3
## 🛠️ 环境搭建

### 📦 创建 Phaser 项目

```bash
pnpm create vite my-game --template vanilla
cd my-game && pnpm install phaser
pnpm dev
```

### 📦 创建 Babylon 项目

```bash
pnpm create vite my-3d --template vanilla
cd my-3d && pnpm install @babylonjs/core
pnpm dev
```

:::callout icon=💡
把项目文件夹交给编码 Agent（Codex / Claude Code），并写一个 **AGENTS.md**：技术栈（Phaser 3.90 / Babylon 8）、文件结构约定、"改完代码刷新浏览器验证"。之后每次对话它都自带背景。
:::

%%W3A%%

%%W3B%%

%%%%% GG2
## 🟦 Phaser 2D 核心

Phaser 的世界观：**Game → Scene → preload/create/update**。🟦

四个概念吃透，2D 游戏就入门了。

%%GA2%%

%%%%% P1
## 🟦 Phaser 初体验：第一个场景

```js
import Phaser from 'phaser'

new Phaser.Game({
  type: Phaser.AUTO,
  width: 800, height: 600,
  physics: { default: 'arcade', arcade: { gravity: { y: 1200 } } },
  scene: { preload, create, update },
})

function preload() { /* 加载资源：this.load.image('player', '...') */ }
function create() {
  this.add.text(400, 300, 'Hello Phaser!', { fontSize: '48px' }).setOrigin(0.5)
}
function update() { /* 每帧执行（60fps） */ }
```

### 🔁 三段式生命周期

- 📥 **preload** — 加载图片/音效（异步，只跑一次）
- 🏗️ **create** — 搭建场景：放对象、设物理、写 HUD
- 🔁 **update** — 游戏循环：每帧读输入、更新逻辑

:::callout icon=💡
Phaser 心智模型：**create 负责"摆好舞台"，update 负责"每帧演戏"**。把逻辑放错位置是最常见的新手错误（比如在 create 里读键盘）。
:::

%%P1A%%

%%P1B%%

%%%%% P2
## 🏃 精灵与动画

**精灵（Sprite）** 是有物理体的游戏对象 —— 区别于静态的 Image：

```js
// create 里
this.player = this.physics.add.sprite(100, 450, 'player')
this.player.setBounce(0.2).setCollideWorldBounds(true)

// 动画：定义一次，随处播放
this.anims.create({
  key: 'run',
  frames: this.anims.generateFrameNumbers('player', { start: 0, end: 7 }),
  frameRate: 10, repeat: -1,
})
this.player.play('run')
```

### 🎨 没有素材？让 Agent 造占位素材

- 🟩 Agent 可以生成**纯色矩形/圆形**当角色（`this.add.rectangle`）
- 🖼️ 也能现场写一个 SVG / canvas 程序化生成 **spritesheet**
- 🚀 迭代策略：先方块跑通玩法，最后换正式素材 —— **玩法优先，美术殿后**

%%P2A%%

%%P2B%%

%%%%% P3
## 🎮 输入与控制

```js
// update 里：键盘
const cursors = this.input.keyboard.createCursorKeys()
if (cursors.left.isDown)  this.player.setVelocityX(-200)
if (cursors.right.isDown) this.player.setVelocityX(200)
else this.player.setVelocityX(0)
if (cursors.up.isDown && this.player.body.touching.down)
  this.player.setVelocityY(-500)   // 只有站在地面才能跳

// 鼠标 / 触控
this.input.on('pointerdown', (pointer) => { /* 射击 / 跳跃 */ })
```

:::callout icon=💡
`touching.down` 判断"在地面" —— 没有它就能**空中无限跳**。游戏手感就藏在这种小判断里，改动后一定要自己试玩。
:::

%%P3A%%

%%P3B%%

%%%%% P4
## 💥 Arcade 物理与碰撞

Arcade 物理 = **速度 + 重力 + AABB 碰撞盒**，简单够用：

```js
// 碰撞：玩家站在平台上
this.physics.add.collider(this.player, this.platforms)

// 重叠：捡金币（不阻挡，触发回调）
this.physics.add.overlap(this.player, this.coins, (player, coin) => {
  coin.destroy()
  score += 10
  scoreText.setText(`分数: ${score}`)
})
```

### ⚖️ collider vs overlap

- 🧱 **collider** — 物理阻挡：站上去、撞墙
- ✨ **overlap** — 穿过触发：吃金币、踩怪物、进传送门

%%P4A%%

%%P4B%%

%%%%% GG3
## 🚀 Phaser 实战：平台跳跃

把四个核心概念拼成一个完整游戏：**平台跳跃 + 金币 + 怪物 + 计分**。🚀

每一步都是标准 Agent 工作流：描述 → 生成 → 试玩 → 反馈。

%%GA3%%

%%%%% M1
## 🗺️ 关卡与平台搭建

```js
function create() {
  const platforms = this.physics.add.staticGroup()
  platforms.create(400, 580, 'ground').setScale(2, 1).refreshBody()
  platforms.create(600, 420, 'ground')
  platforms.create(50, 280, 'ground')
  platforms.create(750, 240, 'ground')
}
```

- 🧱 `staticGroup()` — 静态平台（不动的物体开销为零）
- 📐 `setScale + refreshBody` — 缩放后必须刷新物理体，否则碰撞盒对不上

### 🤖 Agent 提示词示例

> "在 Phaser 平台跳跃里加 5 个平台组成 Z 字形上升路线，起点左下终点右上，用 staticGroup，坐标写清楚"

:::callout icon=💡
关卡设计的本质是**节奏**：跳得出（起点近）→ 跳得爽（中段浮动）→ 跳得险（终点考验）。让 Agent 生成 3 版关卡布局，你试玩选最好的。
:::

%%M1A%%

%%M1B%%

%%%%% M2
## 🏆 计分、生命与游戏状态

```js
// HUD
scoreText = this.add.text(16, 16, '分数: 0', { fontSize: '28px' })

// 踩怪物：玩家在下落且接触面在上方 → 消灭；否则受伤
this.physics.add.overlap(player, monsters, (p, m) => {
  if (p.body.velocity.y > 0) { m.destroy(); p.setVelocityY(-350) }
  else this.scene.restart()      // 简单粗暴：重开
})
```

### 🎬 多场景管理

```js
this.scene.start('GameScene')    // 场景间跳转
this.scene.start('GameOver', { score })
```

- 📋 用场景切分：`MenuScene` → `GameScene` → `GameOverScene`
- 📦 跨场景传数据：`this.scene.start(key, data)`，在 `init(data)` 接收

%%M2A%%

%%M2B%%

%%%%% M3
## 🔊 音效与打磨

```js
// preload 加载，create 播放
this.load.audio('jump', 'assets/jump.mp3')
this.sound.play('jump')

// 粒子：吃金币的小星星
const emitter = this.add.particles(0, 0, 'spark', {
  speed: 200, lifespan: 400, quantity: 8, emitting: false })
emitter.explode(8, coin.x, coin.y)
```

### ✨ 打磨清单（Game Feel）

- 🔊 音效反馈：跳、吃、伤（静音状态下游戏"感觉坏了"）
- 💥 粒子与相机震动（`this.cameras.main.shake(100)`）
- 🎥 相机跟随：`this.cameras.main.startFollow(player)`
- 🐢 数值微调：速度 ±10% 反复试，直到"上头"

:::callout icon=💡
让 Agent 批量出"打磨方案"（音效点清单、粒子时机、数值表），你逐条试玩打勾 —— **Game Feel 是试出来的，不是算出来的**。
:::

%%M3A%%

%%M3B%%

%%%%% GG4
## 🟨 Babylon.js 3D 核心

进入第三维：多出**相机、灯光、材质**三个新角色。🟨

Babylon 的场景图和 Phaser 完全不同，但"游戏循环"的思想是通的。

%%GA4%%

%%%%% B1
## 🟨 Babylon 初体验：第一个 3D 场景

```js
import { Engine, Scene, ArcRotateCamera, Vector3,
         HemisphericLight, MeshBuilder } from '@babylonjs/core'

const engine = new Engine(canvas, true)
const scene = new Scene(engine)

const camera = new ArcRotateCamera('cam', -Math.PI / 2, Math.PI / 3, 12, Vector3.Zero(), scene)
camera.attachControl(canvas, true)          // 鼠标拖转、滚轮缩放

new HemisphericLight('light', new Vector3(0, 1, 0), scene)

const box = MeshBuilder.CreateBox('box', { size: 2 }, scene)

engine.runRenderLoop(() => scene.render())   // 游戏循环
window.addEventListener('resize', () => engine.resize())
```

### 🧭 3D 三件套

- 📷 **相机** — ArcRotateCamera 环绕观察（拖拽/滚轮）；FreeCamera 第一人称；FollowCamera 跟随
- 💡 **灯光** — HemisphericLight 半球环境光；DirectionalLight 方向光（投影）
- 📦 **网格（Mesh）** — 一切 3D 物体：Box / Sphere / Ground / Cylinder

:::callout icon=💡
Babylon 有个杀手锏：官网 Playground 可以在浏览器里直接写 3D 代码 —— 让 Agent 生成 Playground 片段，你贴进去先看效果再搬回项目。
:::

%%B1A%%

%%B1B%%

%%%%% B2
## 🎨 网格、材质与纹理

```js
const ground = MeshBuilder.CreateGround('ground', { width: 30, height: 30 }, scene)

const mat = new StandardMaterial('mat', scene)
mat.diffuseColor = BABYLON.Color3.Teal()          // 纯色
mat.emissiveColor = new BABYLON.Color3(0.2, 0.6, 0.6)  // 自发光（发光宝石！）
box.material = mat

box.position.set(2, 1, -3)      // x 右，y 上，z 前 —— 3D 坐标系
box.rotation.y = Math.PI / 4    // 弧度制旋转
```

### 🖼️ 纹理与程序化素材

- 🖼️ `mat.diffuseTexture = new Texture('wood.png')` — 贴图
- 🎨 没有素材时：Agent 可以写代码**程序化生成贴图**（canvas 画格子/渐变导出 dataURL）
- 📦 组合物体：父节点 `TransformNode` 带动子节点整体变换

%%B2A%%

%%B2B%%

%%%%% B3
## 🎮 3D 输入与角色控制

```js
// update 风格：在 onBeforeRender / scene.onBeforeRenderObservable 里每帧处理
box.position.z += 0.05           // 持续移动

// 键盘输入
const inputMap = {}
scene.onKeyboardObservable.add((info) => {
  inputMap[info.event.key] = info.type === 'KEYDOWN'
})
if (inputMap['w']) box.position.z += 0.1
if (inputMap['s']) box.position.z -= 0.1
```

### 🎥 相机跟随

```js
scene.onBeforeRenderObservable.add(() => {
  camera.target = box.position        // 相机永远看着角色
})
```

:::callout icon=⚠️
3D 最容易晕的是**坐标系**：x 右、y 上、z 前（左手系）。方向不对时先打印 `box.position` 看数值 —— 比"感觉"靠谱。
:::

%%B3A%%

%%B3B%%

%%%%% B4
## 💥 碰撞与拾取

```js
// 网格碰撞（简单场景够用）
scene.collisionsEnabled = true
box.checkCollisions = true
ground.checkCollisions = true
box.moveWithCollisions(new Vector3(0, -0.01, 0))   // 带碰撞移动

// 拾取（鼠标点选 3D 物体）
scene.onPointerObservable.add((info) => {
  const pick = scene.pick(info.event.clientX, info.event.clientY)
  if (pick?.hit && pick.pickedMesh.name.startsWith('gem'))
    pick.pickedMesh.dispose()      // 点到宝石就移除
})
```

- 🧱 **moveWithCollisions** — 带碰撞的移动（会滑墙、落地）
- 🎯 **pick** — 屏幕坐标 → 3D 物体（点击交互的基础）

%%B4A%%

%%B4B%%

%%%%% GG5
## 🟨 Babylon 实战：3D 收集游戏

综合实战：**在 3D 场景里漫步，收集发光宝石，限时计分**。🟨

三次迭代完成：场景 → 玩法 → 打磨发布。

%%GA5%%

%%%%% N1
## 🏗️ 搭建 3D 游戏场景

```js
// 地面 + 边界墙
const ground = MeshBuilder.CreateGround('ground', { width: 40, height: 40 })
ground.checkCollisions = true

// 随机撒 15 颗发光宝石
for (let i = 0; i < 15; i++) {
  const gem = MeshBuilder.CreatePolyhedron('gem', { type: 3, size: 0.4 })
  gem.position.set(rand(-18, 18), 0.6, rand(-18, 18))
  gem.material = glowMat
  gems.push(gem)
}
```

### 🤖 Agent 提示词示例

> "在现有 Babylon 场景加 15 颗随机分布的八面体宝石，青色自发光，缓慢自转 + 上下浮动（用 onBeforeRenderObservable 更新 rotation.y 和 position.y）"

:::callout icon=💡
"自转 + 浮动"这类氛围动画是 Agent 最擅长的 —— 描述清楚**每帧改哪个属性**即可，它写循环比你快十倍。
:::

%%N1A%%

%%N1B%%

%%%%% N2
## 💎 角色控制与计分逻辑

```js
let score = 0, timeLeft = 60

scene.onBeforeRenderObservable.add(() => {
  // 移动角色（WASD + 碰撞）
  const dir = new Vector3(
    (inputMap['d'] ? 1 : 0) - (inputMap['a'] ? 1 : 0), 0,
    (inputMap['w'] ? 1 : 0) - (inputMap['s'] ? 1 : 0))
  if (dir.length()) player.moveWithCollisions(dir.normalize().scale(0.15))
  camera.target = player.position

  // 收集判定：距离 < 1 即收集
  for (const gem of gems) {
    if (!gem.isEnabled()) continue
    if (Vector3.Distance(player.position, gem.position) < 1) {
      gem.setEnabled(false); score++
      hud.text = `💎 ${score}/15  ⏱ ${Math.ceil(timeLeft)}s`
    }
  }
  timeLeft -= engine.getDeltaTime() / 1000
  if (timeLeft <= 0) gameOver(score)
})
```

:::callout icon=⚠️
`engine.getDeltaTime()` 让倒计时**按真实时间**走 —— 用"每帧减 1"在不同帧率的设备上速度会不一样（60fps vs 144fps 一分钟差一倍多）。
:::

%%N2A%%

%%N2B%%

%%%%% N3
## 📦 打磨与发布

### ✨ 发布前打磨清单

- 🎨 宝石收集时缩小消失 + 一声"叮"（Web Audio 或 mp3）
- 🎥 结束镜头：相机缓缓拉远俯瞰全场
- 📊 结算页：`score`、用时、再来一次按钮
- 📱 手机可玩吗？（Babylon 支持触控拖转；测试 VirtualJoystick）

### 🚀 发布

```bash
pnpm build     # 产出 dist/ 纯静态文件
# dist/ 传到任意静态托管（甚至校园网服务器），发链接给同学开玩
```

:::callout icon=💡
游戏做完不是结束：**找 3 个同学试玩**，记录他们卡住/无聊/困惑的地方 —— 这份清单就是下一轮迭代让 Agent 干活的任务表。
:::

%%N3A%%

%%N3B%%

%%%%% GG6
## 🤖 Agent 辅助游戏开发心法

游戏开发 × AI Agent 的独特方法论：**创意你出，代码它写，手感大家一起试**。🤖

最后一组：把这门课的开发模式总结成可复用的工作流。

%%GA6%%

%%%%% A1
## 🤖 游戏开发的 Agent 工作流

### 🎯 游戏提示词三段式

> 🎮 **玩法**：角色做什么、失败条件、胜利条件
> 🎨 **表现**：占位素材策略、镜头、粒子音效
> 🔢 **数值**：速度、重力、跳跃力、冷却时间（全部给具体数字）

### 🔁 迭代节奏

1. 🧱 **先跑通**：方块小人 + 静态平台，能跳能落
2. ✨ **再加料**：金币 → 怪物 → 音效粒子（一次只加一个）
3. 🎮 **必试玩**：每个迭代自己上手玩 2 分钟 —— 自动化测试测不出"手感"

:::callout icon=⚠️
游戏代码最容易"看起来对、玩起来错"：重力 1200 和 12000 都不报错，但一个能玩一个飞天。**数值类 bug 只能靠试玩发现**。
:::

%%A1A%%

%%A1B%%

%%%%% A2
## 🎨 让 Agent 生成美术资源

没有美术功底也能有"像样"的画面 —— 让 Agent 生成**程序化素材**：

### 🎨 四种零素材方案

- 🟦 **几何占位** — 纯色方块/圆 + 描边，风格化"极简风"
- 🖼️ **程序化 spritesheet** — Agent 写 canvas 脚本画角色帧，导出 PNG
- 🧑‍🎤 **Emoji 精灵** — `this.add.text` 直接把 🦊🍕💎 当角色，可爱且零成本
- 🌈 **程序化贴图** — Babylon 里用 DynamicTexture 画格子地面、渐变天空

:::callout icon=💡
提示词："用 canvas 生成 8 帧 64×64 的角色跑步 spritesheet，橙色方块小人带摆臂" —— Agent 输出脚本，跑一次就得到素材文件。**先统一风格再谈细节**。
:::

%%A2A%%

%%A2B%%

%%%%% A3
## ⚖️ 调参、调试与验收

### 🔧 数值调试工作流

1. 📊 让 Agent 把所有数值集中到一个 **CONFIG 对象**（速度/重力/分数/时长）
2. 🎚️ 改一处 → 刷新 → 试玩 → 下一处
3. 📝 记录每版数值（v1 太难 / v2 合适 / v3 太简单）—— 这就是游戏策划的日常

### 🐞 游戏调试技巧

- 🖨️ 把 `player.position`、碰撞状态打印在屏幕 HUD 上，实时看
- 🎯 怀疑哪就二分：注释掉一半逻辑，看问题还在不在
- 🧊 让 Agent 给游戏加 **debug 模式**（显示碰撞盒、飞行、跳关）—— 提升迭代速度十倍

:::callout icon=🎯
结课作业：用 Phaser 或 Babylon 做一个**原创小游戏**（玩法不限），交给 Agent 辅助完成，但三条底线自己守：玩法说明自己写、数值自己调、找同学试玩三轮并迭代一次。做出让人愿意再玩一局的东西！🚀
:::

%%A3A%%

%%A3B%%
