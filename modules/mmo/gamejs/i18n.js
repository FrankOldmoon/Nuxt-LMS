// i18n.js —— 游戏界面文案（跟随主项目语言：en / cn）
// 文案统一维护在 modules/mmo/i18n/locales/{en,cn}.json 的 mmo 命名空间下，
// 与 Vue 侧的 $t('mmo.xxx') 共用同一份数据；物品/对话等内容文案见 content-i18n.js。
import cn from "../i18n/locales/cn.json";
import en from "../i18n/locales/en.json";
import { applyContentLang } from "./content-i18n.js";

const dicts = { zh: cn, en };

let lang = "en";

// 设置游戏语言（'zh' | 'en'）；同步切换内容文案（物品/对话/任务/地图名）
export function setLang(l) {
  lang = l === "en" ? "en" : "zh";
  try { applyContentLang(lang); } catch (e) { console.warn("[i18n] content lang:", e); }
}
export function getLang() { return lang; }
export function isZh() { return lang !== "en"; }

// t("mmo.title") 与 t("bag.title") 都解析到 dict.mmo 下的对应层级
export function t(key, params) {
  const path = key.startsWith("mmo.") ? key.slice(4) : key;
  let node = dicts[lang] && dicts[lang].mmo;
  for (const seg of path.split(".")) {
    if (node == null || typeof node !== "object") { node = undefined; break; }
    node = node[seg];
  }
  let s = typeof node === "string" ? node : key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(v);
  return s;
}
