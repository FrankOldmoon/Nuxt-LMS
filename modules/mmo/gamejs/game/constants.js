// constants.js —— Phaser 场景与精灵共享常量
// 注意: Phaser 由 index.html 以全局 script 形式引入,不在本模块 import,避免依赖 npm phaser 包。

// 每个动画帧边长(像素),与素材一致
export const CELL = 64;
// 场景尺寸
export const W = 1280;
export const H = 720;
// 地面线(脚的位置)
export const GROUND_Y = 470;

// LPC 精灵表每个动画的行序: 0=up(背) 1=left 2=down(正) 3=right
export const DIRECTIONS = ["up", "left", "down", "right"];

// 可播放动画元数据
export const ANIMS = [
  { name: "walk", loop: true, fps: 13 },
  { name: "run", loop: true, fps: 14 },
  { name: "idle", loop: true, fps: 6 },
  { name: "jump", loop: false, fps: 12 },
  { name: "slash", loop: false, fps: 16 },
  { name: "spellcast", loop: false, fps: 12 },
  { name: "shoot", loop: false, fps: 14 },
  { name: "hurt", loop: false, fps: 7 }, // 素材是"被击倒踉跄",放慢以免看着像翻滚
];

// 动作键 → 动画名(一次性动作)
export const ACTION_KEYS = { slash: "slash", shoot: "shoot", spell: "spellcast", hurt: "hurt", jump: "jump" };