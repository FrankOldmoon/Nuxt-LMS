// imageLoader.js —— 素材的图片加载与路径形态解析
// 用浏览器原生 Image 加载(而非 fetch): 它对 HTTP 缓存 / 304 免疫,地址栏能显示的图一定能加载。
// 同一 URL 只加载一次; null 也缓存,避免对不存在的路径反复请求。

// 素材由 game-assets API 提供（assets/mmo/**）
export const BASE = "/api/game-assets/mmo/";

// ---------------- 图片加载 ----------------
export const imgCache = new Map();
function loadImg(url) {
  // SSR/无浏览器环境下 Image 不存在,静默返回 null,避免 unhandledRejection
  if (typeof Image === "undefined") return Promise.resolve(null);
  if (imgCache.has(url)) return Promise.resolve(imgCache.get(url));
  return new Promise((res) => {
    const im = new Image();
    let done = false;
    const finish = (v) => { if (!done) { done = true; imgCache.set(url, v); res(v); } };
    const timer = setTimeout(() => finish(null), 4000);
    im.onload = () => { clearTimeout(timer); finish(im); };
    im.onerror = () => { clearTimeout(timer); finish(null); };
    im.src = url;
  });
}
// 加载素材并绘制为 canvas 返回;失败或不存在返回 null。
export async function fetchBitmap(url) {
  const im = await loadImg(url);
  if (!im || !im.naturalWidth || !im.naturalHeight) return null;
  const cv = document.createElement("canvas");
  cv.width = im.naturalWidth;
  cv.height = im.naturalHeight;
  cv.getContext("2d").drawImage(im, 0, 0);
  return cv;
}
// 只解析一次每个图层的基础路径形态(body/adult/flat),后续全动画复用。
// 返回 { k, bodySub }。k 为命中形态;bodySub 为 body 变体实际使用的体型子目录。
// 多数衣物/裤子/鞋子只有 male 材质,故 body 变体在专用体型不存在时回退到 male。
export async function resolveVariant(dir, body, probeAnim = "idle") {
  const candidates = [];
  const pushBody = (b) => candidates.push({ k: "body", bodySub: b, url: `${dir}${b}/${probeAnim}.png` });
  pushBody(body);
  if (body !== "male") pushBody("male"); // 衣物等只有 male 子目录时的回退
  candidates.push({ k: "adult", bodySub: body, url: `${dir}adult/${probeAnim}.png` });
  candidates.push({ k: "flat", bodySub: body, url: `${dir}${probeAnim}.png` });
  for (const c of candidates) if (await fetchBitmap(BASE + c.url)) return c;
  return null;
}
export function variantUrl(dir, body, anim, variant) {
  const bs = (variant && variant.bodySub) || body;
  if (variant && variant.k === "body") return `${dir}${bs}/${anim}.png`;
  if (variant && variant.k === "adult") return `${dir}adult/${anim}.png`;
  return `${dir}${anim}.png`;
}