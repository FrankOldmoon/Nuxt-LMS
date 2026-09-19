// maps.js —— 地图化配置访问(配置驱动: 新增地图只需在 maps.json 加一项)
// mapId 即玩家所在地图标识(服务器持久化),不再区分仅 outdoor/indoor 两类。
import mapsData from "../config/maps.json";

export const MAPS = mapsData.maps;

// 取某地图配置
export function mapCfg(mapId) {
  return MAPS[mapId];
}

// 某地图是否室内
export function isIndoor(mapId) {
  const m = MAPS[mapId];
  return !!(m && m.type === "indoor");
}