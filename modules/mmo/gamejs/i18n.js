// i18n.js —— 游戏界面文案（跟随主项目语言：en / cn）
// 文案统一维护在 modules/mmo/i18n/locales/{en,cn}.json 的 mmo 命名空间下，
// 与 Vue 侧的 $t('mmo.xxx') 共用同一份数据；物品/对话等内容文案见 content-i18n.js。
//
// 注意：这些 locale JSON 会被 Nuxt i18n 的 Vite 插件**编译成 vue-i18n 的消息 AST**
// （值是 {type, body, loc…} 而不是字符串），因此游戏侧不能直接 import JSON 读取。
// 改为由宿主页面（mmo.vue / mmo-test.vue）注入 Vue 的 t 函数，游戏内 t() 转发给它。
import { applyContentLang } from "./content-i18n.js";

let lang = "en";
let translator = null; // 宿主注入： (key:'mmo.xxx', params) => string

// 注入 Vue i18n 的 t（游戏内 key 会自动补 'mmo.' 前缀）
export function setTranslator(fn) { translator = typeof fn === "function" ? fn : null; }

// 设置游戏语言（'zh' | 'en'）；同步切换内容文案（物品/对话/任务/地图名）
export function setLang(l) {
  lang = l === "en" ? "en" : "zh";
  try { applyContentLang(lang); } catch (e) { console.warn("[i18n] content lang:", e); }
}
export function getLang() { return lang; }
export function isZh() { return lang !== "en"; }

const warned = new Set();
// t("mmo.title") 与 t("bag.title") 都解析到 mmo 命名空间下
export function t(key, params) {
  if (translator) {
    const k = key.startsWith("mmo.") ? key : "mmo." + key;
    return translator(k, params);
  }
  if (!warned.has(key)) {
    warned.add(key);
    console.warn("[mmo i18n] translator 未注入，无法翻译:", key);
  }
  return key;
}
