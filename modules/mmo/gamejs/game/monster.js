// monster.js —— 怪物组件: 从 assets/monsters/*.png 加载 4 行精灵表
// 每行 = 一个朝向(0上 1左 2下 3右),每行前 4 列为行走帧,其后若干列为攻击帧。
// 提供行走动画、红色受击闪光、攻击动作;移动/AI 由场景负责。
import { fetchBitmap, BASE } from "../lpc/imageLoader.js";
import { sfx } from "./sfx.js";
import monstersData from "../config/monsters.json";

// 支持的怪物(6/7 列,不含 slime/small_worm 等超宽表)：key + 资源文件
// hp 生命 / atk 对玩家单次伤害 / xp 击杀经验 / drops 掉落表(物品id,击杀随机 roll 一个,dropChance 概率;含装备)
export const MONSTER_DEFS = monstersData.monsters;

// 注册所有怪物纹理为 sprite sheet(全局一次)
export async function registerMonsterTextures(scene) {
  for (const def of MONSTER_DEFS) {
    const key = "mon_" + def.key;
    if (scene.textures.exists(key)) continue;
    const cv = await fetchBitmap(BASE + def.file);
    if (!cv) { console.warn("[monster] 加载失败:", def.file); continue; }
    const cell = Math.round(cv.height / 4); // 固定 4 行
    scene.textures.addSpriteSheet(key, cv, { frameWidth: cell, frameHeight: cell });
  }
}

export class Monster {
  constructor(scene, x, y, key, opts = {}) {
    this.scene = scene;
    this.key = key;
    this.texKey = "mon_" + key;
    const tex = scene.textures.get(this.texKey);
    this.cell = tex.source[0].height / 4;
    this.cols = Math.round(tex.source[0].width / this.cell);
    this.attackCols = Math.max(2, this.cols - 4); // 第 5 列起为攻击帧
    const sc = opts.scale || 1;
    this.scale = sc;
    // 血量(不同怪物不同)
    this.maxHp = opts.hp || 60;
    this.hp = this.maxHp;
    this.dead = false;
    const showBar = opts.showBar !== false; // 章节任务敌人不显示血条
    this.x = x; this.y = y; // 逻辑位置(移动基准,不含浮动偏移)
    this.spr = scene.add.sprite(x, y, this.texKey, this.frameAt(2, 0)).setOrigin(0.5, 1).setScale(sc).setDepth(4);
    this.shadow = scene.add.ellipse(x, y + 4, 34 * sc, 10 * sc, 0x000000, 0.28).setDepth(3);
    // 头顶血条(所有怪物统一长度,按百分比填充;填充向左边收缩)
    this.barW = 34;
    const y0 = y - this.cell * sc - 10;
    this.hpBg = scene.add.rectangle(x - this.barW / 2, y0, this.barW, 5, 0x111111, 0.85).setOrigin(0, 0.5).setDepth(6).setVisible(showBar);
    this.hpFill = scene.add.rectangle(x - this.barW / 2, y0, this.barW, 5, 0x44ff44, 1).setOrigin(0, 0.5).setDepth(7).setVisible(showBar);
    this.state = { facing: 2, mode: "walk" };
    this._animT = 0;
    this._hurt = null;      // {until, active}
    this._flash = 0;
    this._attackT = 0;      // 剩余攻击动作时间
    this._bob = Math.random() * Math.PI * 2;
  }
  frameAt(facing, col) { return facing * this.cols + col; }
  // 场景切换后同 key 纹理可能已按新尺寸重建,clamp 到当前帧数内,避免 setTexture 越界崩溃
  frameSafe(f) {
    const t = this.scene.textures.get(this.texKey);
    if (!t || !t.source || !t.source.length) return 0;
    return Math.max(0, Math.min(f, (t.frameTotal || 1) - 1));
  }
  setFacing(f) { this.state.facing = ((f % 4) + 4) % 4; }
  hurt() {
    if (this._hurt) return;
    this._hurt = { until: this.scene.time.now + 500 };
    this._flash = 0;
  }
  // 受到伤害;返回 true 表示死亡
  damage(dmg) {
    this.hp = Math.max(0, this.hp - dmg);
    this.hurt();
    sfx.hurtMonster();
    if (this.hp <= 0) this.dead = true;
    return this.dead;
  }
  attack(t = 800) {
    if (this._attackT > 0 || this._hurt) return;
    this._attackT = t;
    this._attackFrame = 0;
  }

  // 每帧驱动; xx, yy 为逻辑坐标(移动基准),浮动偏移只应用于渲染,不回灌逻辑位置
  // moving=false 时站立不循环走动帧
  update(delta, xx, yy, moving = true) {
    this.x = xx; this.y = yy; // 记录逻辑位置
    this.spr.x = xx;

    // 血条位置与比例(向左边收缩: 固定左端,宽度按百分比)
    const yTop = yy - this.cell * this.scale - 10;
    const left = xx - this.barW / 2;
    this.hpBg.setPosition(left, yTop);
    this.hpFill.setPosition(left, yTop);
    const ratio = Math.max(0, this.hp / this.maxHp);
    this.hpFill.displayWidth = Math.max(2, this.barW * ratio);
    this.hpFill.setFillStyle(ratio > 0.5 ? 0x44ff44 : ratio > 0.2 ? 0xffd344 : 0xff4444, 1);

    // 受击红色闪光(闪烁后恢复)
    if (this._hurt) {
      this._flash += delta;
      const flick = Math.floor(this._flash / 80) % 2 === 0;
      this.spr.setTint(flick ? 0xff4040 : 0xffffff);
      if (this.scene.time.now >= this._hurt.until) {
        this.spr.setTint(0xffffff);
        this._hurt = null;
      }
    }

    // 攻击动作(用攻击序列帧过一遍)
    if (this._attackT > 0) {
      this._attackT -= delta;
      const n = this.attackCols;
      const col = 4 + Math.min(n - 1, Math.floor((this._attackT * n) / 800) % n);
      this.spr.setTexture(this.texKey, this.frameSafe(this.frameAt(this.state.facing, col)));
    } else {
      // 行走动画: 前 4 列循环;停下时不循环(展示站姿帧0)
      if (moving) {
        this._animT += delta;
        const col = Math.floor((this._animT / 260) % 4);
        this.spr.setTexture(this.texKey, this.frameSafe(this.frameAt(this.state.facing, col)));
      } else {
        this.spr.setTexture(this.texKey, this.frameSafe(this.frameAt(this.state.facing, 0)));
      }
      this.state.mode = "walk";
    }

    // 轻微上下浮动增强生命感(仅影响渲染,不影响逻辑位置)
    this._bob += delta * 0.003;
    const bob = Math.sin(this._bob) * 2;
    this.spr.y = yy + bob;
    this.shadow.setPosition(xx, yy + 4);
  }
  destroy() { this.spr.destroy(); this.shadow.destroy(); this.hpBg.destroy(); this.hpFill.destroy(); }
}