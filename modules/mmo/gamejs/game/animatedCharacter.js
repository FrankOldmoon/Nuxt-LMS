// animatedCharacter.js —— 可复用的角色渲染组件
// 封装: 合成结果注册为 strip 纹理 + 手动逐帧播放 + 方向回退 + 动作(含受击特效)。
// 单人与多人场景共用;每个实例用独立 ns 作为纹理前缀,避免多人外观不同时纹理 key 冲突。
import { CELL, ANIMS, DIRECTIONS } from "./constants.js";
import { DEV, coordText } from "./debugOverlay.js";

export class AnimatedCharacter {
  constructor(scene, x, y, ns = "c", opts = {}) {
    this.scene = scene;
    this.ns = ns;
    this.enableHurtFx = opts.enableHurtFx || false; // 本地操控玩家开启,远端同步玩家关闭
    this.ready = false;
    this._anim = null;
    this._animT = 0;
    this._hurtFx = null;
    this._mv = false; // MV 行走图(48px cell)模式
    this.state = { facing: 2, mode: "idle", busy: false }; // 默认正面朝下

    // 临时占位纹理
    const tmpKey = `${ns}_tmp`;
    if (!scene.textures.exists(tmpKey)) {
      const tmp = scene.textures.createCanvas(tmpKey, CELL, CELL);
      tmp.getContext().fillStyle = "#4f8cff";
      tmp.getContext().fillRect(0, 0, CELL, CELL);
      tmp.refresh();
    }
    // 本地操控玩家(enableHurtFx)提层到最上层,其余(远端/场景)用默认
    const top = this.enableHurtFx;
    const sc = opts.scale || 3;
    this._baseScale = sc; // 视觉倍率(64 帧基准;大帧纹理自动折算)
    this.sprite = scene.add.sprite(x, y, tmpKey, 0).setScale(sc).setOrigin(0.5, 1).setDepth(top ? 50 : 5);
    this.shadow = scene.add.ellipse(x, y + 4, 44, 12, 0x000000, 0.28).setDepth(top ? 49 : 4);
    this.shadow.setSize(44 * sc, 12 * sc); // 阴影大小随人物缩放
    this.nameTag = scene.add
      .text(x, y - this.sprite.displayHeight + 4, opts.name || "", {
        fontFamily: '"PingFang SC"', fontSize: "14px", color: opts.nameColor || "#ffffff",
        stroke: "#000000", strokeThickness: 3,
      })
      .setOrigin(0.5, 1).setDepth(top ? 51 : 6);
    // 开发阶段: 名字上方额外显示当前世界坐标与瓦片序号(生产构建不创建,零开销)
    this.coordTag = null;
    if (DEV) {
      this.coordTag = scene.add
        .text(x, y - this.sprite.displayHeight + 4, "", {
          fontFamily: "monospace", fontSize: "11px", color: "#9fe8ff",
          stroke: "#000000", strokeThickness: 2,
        })
        .setOrigin(0.5, 1).setDepth((top ? 51 : 6) + 1)
        .setVisible(false);
    }
  }

  // 将合成结果注册为 strip 纹理(带 ns 前缀),通用
  // layout[a] 兼容两种形态: 数组(旧,全 64 帧) 或 {frames, cell}(新,支持 192 大帧)
  // MV 行走图: layout 各动画 cell 均为 48,逐方向 3 帧
  build(sheets, layout) {
    this._cells = {};
    let mv = true;
    ANIMS.forEach((m) => {
      const a = m.name;
      const sheet = sheets[a];
      if (!sheet) return;
      const lay = layout[a];
      const rows = Array.isArray(lay) ? lay : (lay ? lay.frames : null);
      const cell = Array.isArray(lay) ? CELL : (lay ? lay.cell : CELL) || CELL;
      if (cell !== 48) mv = false; // 只要任一动画不是 MV cell 就按通用逻辑
      if (!rows) return;
      this._cells[a] = cell;
      rows.forEach((n, r) => {
        if (!n) return;
        const strip = document.createElement("canvas");
        strip.width = n * cell;
        strip.height = cell;
        strip.getContext("2d").drawImage(sheet, 0, r * cell, n * cell, cell, 0, 0, n * cell, cell);
        const key = this.texKey(a, r);
        if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
        this.scene.textures.addSpriteSheet(key, strip, { frameWidth: cell, frameHeight: cell, margin: 0, spacing: 0 });
      });
    });
    // 只有 walk/idle 的 MV 模式: 高亮标记,run 等回退 walk
    this._mv = mv && this._cells.walk && !this._cells.run;
    this.applyFrameOrigin();
    this.playForState(); // 立即应用真实纹理: 即使该角色之后不再被 update 驱动(异常路径), 也不会停留在蓝色占位方块
  }

  // 大帧(192)纹理: 角色脚底在帧内 y=2/3 处; scale 不变(角色在帧内大小与 64 帧一致)
  // MV(48): 角色跨整格,脚底在底部; 因 MV 格比 64 小, 按比例放大保证视觉一致
  applyFrameOrigin() {
    // MV 角色没有 run/jump 等动画(都回退 walk),统一按 walk 的 48 cell 计算 scale,
    // 避免跑动时落到默认 CELL 导致缩放/原点突变。
    const eff = this._mv ? "walk" : (this._cells && this._cells[this.state.mode] ? this.state.mode : "walk");
    const c = (this._cells && this._cells[eff]) || (this._mv ? 48 : CELL);
    if (c === this._appliedCell) return;
    this._appliedCell = c;
    const base = this._baseScale || 1;
    if (c === 48) {
      this.sprite.setOrigin(0.5, 1);
      this.sprite.setScale(base * (64 / 48));
    } else {
      this.sprite.setOrigin(0.5, c === CELL ? 1 : 2 / 3);
      this.sprite.setScale(base); // 角色在帧内大小不变,无需折算
    }
  }

  texKey(anim, row) { return `${this.ns}_T_${anim}_${row}`; }

  // 按当前状态选纹理;目标方向缺失时回退到有帧的方向(如某些动作仅部分方向有画面)
  // MV 模式: run/jump/slash 等仅 walk/idle 时回退 walk
  normalizeMode(mode) {
    if (this._mv && !this._cells[mode]) return "walk";
    return mode;
  }
  resolveTex(mode, facing) {
    mode = this.normalizeMode(mode);
    for (const f of [facing, 0, 1, 3, 2]) {
      const k = this.texKey(mode, f);
      if (this.scene.textures.exists(k) && this.scene.textures.get(k).frameTotal > 1) return k;
    }
    return null;
  }

  // 设置视觉状态(供本地输入与远端同步调用)
  setState(mode, facing) {
    this.state.mode = mode;
    this.state.facing = facing;
  }

  // 根据当前状态确定目标纹理,并初始化"手动逐帧"计时
  playForState() {
    if (!this.sprite || !this.sprite.scene) return;
    const { mode, facing } = this.state;
    const tkey = this.resolveTex(mode, facing);
    if (!tkey) { this._anim = null; return; }
    if (!this._anim || this._anim.tkey !== tkey) {
      const meta = ANIMS.find((m) => m.name === mode);
      const tex = this.scene.textures.get(tkey);
      this._anim = {
        tkey,
        total: tex.frameTotal - 1, // frameTotal 含隐藏 __BASE 帧
        fps: meta ? meta.fps : 8,
        loop: meta ? meta.loop !== false : true,
      };
      this._animT = 0;
      this.applyFrameOrigin(); // 动画切换时帧尺寸可能变化(64↔192)
      this.sprite.setTexture(tkey, 0);
    }
  }

  // 每帧按帧率推进序列帧(手动播放,不依赖 Phaser anims step)
  tickFrame(delta) {
    if (!this._anim || !this.sprite || !this.sprite.scene) return;
    this._animT += delta;
    const a = this._anim;
    const n = Math.floor((this._animT / 1000) * a.fps);
    if (!a.loop && n >= a.total) {
      // 一次性动作播完 → 回到待机并解除 busy
      this.state.busy = false;
      this.state.mode = "idle";
      this._anim = null;
      this.playForState();
      return;
    }
    const idx = a.loop ? n % a.total : Math.min(n, a.total - 1);
    this.sprite.setTexture(a.tkey, idx);
  }

  // 触发动作(本地玩家输入);hurt 走闪红特效而非击倒动画
  doAction(anim) {
    if (!this.ready || this.state.busy) return;
    if (!this.resolveTex(anim, this.state.facing)) return;
    this.state.busy = true;
    if (anim === "hurt") {
      this._hurtFx = {
        until: this.scene.time.now + 450,
        originX: this.sprite.x,
        dir: this.state.facing === 1 ? 1 : this.state.facing === 3 ? -1 : 0,
      };
      this.sprite.setTint(0xff5a5a);
      this.playForState();
    } else {
      this.state.mode = anim;
    }
  }

  // 受击特效: 450ms 内闪红闪烁 + 轻微后仰,结束后恢复
  tickHurt() {
    if (!this.enableHurtFx || !this._hurtFx) return;
    const fx = this._hurtFx;
    const left = fx.until - this.scene.time.now;
    if (left <= 0) {
      this.sprite.setTint(0xffffff);
      this.sprite.x = fx.originX;
      this._hurtFx = null;
      this.state.busy = false;
    } else {
      const t = 1 - left / 450;
      this.sprite.setTint(t % 0.25 < 0.125 ? 0xffffff : 0xff5a5a);
      this.sprite.x = fx.originX + fx.dir * Math.sin(t * Math.PI) * 18;
      this.syncShadow();
    }
  }

  // 影子与名字跟随精灵
  syncShadow() {
    this.shadow.setPosition(this.sprite.x, this.sprite.y + 4);
    this.nameTag.setPosition(this.sprite.x, this.sprite.y - this.sprite.displayHeight + 4);
    if (this.coordTag) {
      this.coordTag.setPosition(this.sprite.x, this.sprite.y - this.sprite.displayHeight + 4 - 15);
    }
  }

  // 开发阶段: 刷新头顶坐标/瓦片文本(生产构建为无操作)
  setCoord(x, y) {
    if (!this.coordTag) return;
    this.coordTag.setText(coordText(x, y)).setVisible(true);
  }

  // 每帧驱动动画(由场景 update 调用)
  update(delta) {
    if (!this.ready) return;
    // 场景已销毁/切换中: 不再驱动,避免访问已释放的 sys 报错
    const sys = this.scene && this.scene.sys;
    if (!sys) return;
    this.tickHurt();
    this.playForState();
    this.tickFrame(delta);
    this.syncShadow();
  }

  setName(name) { this.nameTag.setText(name); }
  destroy() {
    // 回收本角色生成的纹理(避免长会话远端玩家/NPC 进出累积 GPU 纹理, 评审 #7)
    // 本地操控玩家(enableHurtFx)的纹理跨场景复用同一 ns, 在此跳过以免切换场景时与新建角色竞争同一 ns
    if (!this.enableHurtFx) {
      const prefix = this.ns + "_";
      const tm = this.scene && this.scene.textures;
      if (tm && tm.list) {
        const keys = [];
        for (const k in tm.list) if (k.startsWith(prefix)) keys.push(k);
        for (const k of keys) tm.remove(k);
      }
    }
    this.sprite.destroy(); this.shadow.destroy(); this.nameTag.destroy();
    if (this.coordTag) this.coordTag.destroy();
  }
}