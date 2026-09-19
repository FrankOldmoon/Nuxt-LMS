// statsHud.js —— 玩家状态 HUD(右上角统一面板)
// 布局(右对齐): 角色 face 头像 + 等级 | 金币 | 经验条 | 血条;数值随 tween 平滑变化
// (体力/饱食度已移除)
import { t } from "../i18n.js";
import { buildFaceAvatar } from "../shared/face.js";

const BAR_W = 150, BAR_H = 10, GAP = 18, VAL_GAP = 74, FACE = 46;

export class StatsHud {
  constructor(scene, right, yy) {
    this.scene = scene;
    if (right === undefined) right = scene.scale.width - 14;
    const top = yy === undefined ? 22 : yy;
    this.disp = { hp: 0, maxHp: 100, xp: 0, xpNeed: 100, level: 1, coin: 0 };
    this._had = false;
    this._tid = 0;

    // ---- 头像 + 等级 ----
    const faceKey = "hface_" + String(Math.random()).slice(2);
    if (!scene.textures.exists(faceKey)) scene.textures.createCanvas(faceKey, 1, 1);
    this.faceY = top + FACE / 2;
    this.face = scene.add.image(right, this.faceY, faceKey)
      .setOrigin(1, 0.5).setScrollFactor(0, 0).setDepth(21)
      .setDisplaySize(FACE, FACE).setVisible(false);
    this.faceMask = scene.add.ellipse(right - FACE / 2, this.faceY, FACE, FACE, 0x0d141f, 0.6).setScrollFactor(0, 0).setDepth(20);
    // 金币显示在 Lv 的左边(同一行)
    this.levelText = scene.add.text(right - FACE - 8, this.faceY, "Lv.1", {
      fontFamily: '"PingFang SC"', fontSize: "16px", color: "#c9a7ff", fontStyle: "bold",
      stroke: "#000000", strokeThickness: 3,
    }).setOrigin(1, 0.5).setScrollFactor(0, 0).setDepth(21);
    this.coinText = scene.add.text(right - FACE - 8 - 68, this.faceY, "", {
      fontFamily: '"PingFang SC"', fontSize: "13px", color: "#ffd66b", fontStyle: "bold",
      stroke: "#000000", strokeThickness: 3,
    }).setOrigin(1, 0.5).setScrollFactor(0, 0).setDepth(21);

    // ---- 两条状态条 ----
    const barRight = right - VAL_GAP;
    const mkBar = (yy, color, label) => {
      const bg = scene.add.rectangle(barRight, yy, BAR_W, BAR_H, 0x11141c, 0.8)
        .setOrigin(1, 0.5).setScrollFactor(0, 0).setDepth(20);
      const fill = scene.add.rectangle(barRight, yy, BAR_W, BAR_H, color, 1)
        .setOrigin(1, 0.5).setScrollFactor(0, 0).setDepth(21);
      const lab = scene.add.text(barRight - BAR_W - 6, yy, label, {
        fontFamily: '"PingFang SC"', fontSize: "12px", color: "#cfd8e6", fontStyle: "bold",
      }).setOrigin(1, 0.5).setScrollFactor(0, 0).setDepth(21);
      const val = scene.add.text(barRight + 8, yy, "", {
        fontFamily: '"PingFang SC"', fontSize: "12px", color: "#e8eef8", fontStyle: "bold",
        stroke: "#000000", strokeThickness: 3,
      }).setOrigin(0, 0.5).setScrollFactor(0, 0).setDepth(21);
      return { bg, fill, lab, val };
    };
    let bY = top + FACE + GAP;
    this.bars = {
      xp: mkBar(bY, 0xa06bff, t("stat.xp")),
      hp: mkBar((bY += GAP), 0xff5a5a, t("stat.hp")),
    };
  }

  // 显示角色 face(canvas 为 buildFaceAvatar 合成的头像)
  setFaceCanvas(canvas) {
    try {
      const key = "hface_" + String(Math.random()).slice(2);
      const tex = this.scene.textures.createCanvas(key, FACE, FACE);
      if (!tex) return;
      const ctx = tex.getContext();
      const prev = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(canvas, 0, 0, FACE, FACE);
      ctx.imageSmoothingEnabled = prev;
      tex.refresh();
      this.face.setTexture(key);
      this.face.setDisplaySize(FACE, FACE);
      this.face.setVisible(true);
    } catch (e) {
      console.warn("[hud face]", e);
    }
  }
  setFaceAsync(gender, layers) {
    buildFaceAvatar(gender, layers).then((cv) => { if (cv) this.setFaceCanvas(cv); }).catch(() => {});
  }
  setCoin(n) { this.disp.coin = n; this.render(); }

  // 场景 shutdown 时显式销毁: 停止 tween, 置空 Text 引用, 防止 delayedCall 残留触发 setText 崩溃
  destroy() {
    this._tid = -1; // 使 setStats 的 step 立即退出
    this._destroyed = true;
    this.coinText = null;
    this.levelText = null;
    this.face = null;
    this.bars = null;
  }

  setStats(s) {
    const to = {
      hp: s.hp, maxHp: s.maxHp,
      xp: s.xp, xpNeed: Math.max(1, s.xpNeed), level: s.level,
    };
    if (!this._had) {
      this._had = true;
      Object.assign(this.disp, to);
      this.render();
      return;
    }
    const from = { ...this.disp };
    const id = (this._tid = (this._tid || 0) + 1);
    const t0 = this.scene.time.now, dur = 380;
    const step = () => {
      if (this._tid !== id || this._destroyed) return;
      if (!this.coinText || !this.coinText.scene) return;
      const p = Math.min(1, (this.scene.time.now - t0) / dur);
      const ease = 1 - Math.pow(1 - p, 3);
      for (const k of Object.keys(to)) this.disp[k] = from[k] + (to[k] - from[k]) * ease;
      this.render();
      if (p < 1) this.scene.time.delayedCall(16, step);
    };
    step();
  }

  render() {
    if (this._destroyed || !this.coinText || !this.coinText.scene) return;
    try {
      const d = this.disp;
      this.levelText.setText("Lv." + Math.round(d.level));
      this.coinText.setText(`${t("gold.label")} ${Math.round(d.coin)}`);
      const setBar = (b, v, max, color) => {
        const ratio = Math.max(0, Math.min(1, v / max));
        b.fill.displayWidth = Math.max(2, BAR_W * ratio);
        b.fill.setFillStyle(color, 1);
        b.val.setText(`${Math.round(v)}/${Math.round(max)}`);
      };
      setBar(this.bars.xp, d.xp, d.xpNeed, 0xa06bff);
      setBar(this.bars.hp, d.hp, d.maxHp, d.hp / d.maxHp > 0.5 ? 0xff5a5a : d.hp / d.maxHp > 0.2 ? 0xff8f3d : 0xff2d2d);
    } catch { /* 场景已销毁, 忽略 */ }
  }
}