// debugOverlay.js —— 开发阶段调试显示辅助
// 仅当 import.meta.env.DEV 为真(本地开发)时启用;生产构建自动关闭。
// 提供: DEV 判定、瓦片换算、坐标文本格式化。供角色头顶坐标与鼠标坐标 HUD 复用。
export const DEV =
  typeof import.meta !== "undefined" &&
  !!import.meta.env &&
  !!import.meta.env.DEV;

// 与 tileDraw.TILE 保持一致(世界像素 → 瓦片索引的换算单位)
const TILE = 48;

export function tileOf(x, y) {
  return [Math.floor(x / TILE), Math.floor(y / TILE)];
}

// 格式化: "像素(x,y)  [瓦片tx,ty]"
export function coordText(x, y) {
  const [tx, ty] = tileOf(x, y);
  return `${Math.round(x)},${Math.round(y)}  [${tx},${ty}]`;
}