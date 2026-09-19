/* tileDraw.js —— 统一复用 gamejs/tile-draw.js（评审 #8：避免两份算法漂移）
 * rpgMap.js 经 ./tileDraw.js 导入本文件，实际实现全部在 ../tile-draw.js。
 * 这样只维护一份 RPG Maker MV 自动瓦片算法，改一处即全局生效。
 */
export * from '../tile-draw.js'
