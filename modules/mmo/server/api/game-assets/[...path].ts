// game-assets/[...path].ts —— 从项目根目录 game_assets 文件夹对外提供游戏素材(图片/json/脚本等)
// 作用: 素材不参与构建打包(不在 public、也不被 import.meta.glob 引用),
//       由本 API 按需流式返回,减少一次公共资源拷贝并支持长期缓存。
// 素材根目录解析: 优先 GAME_ASSETS_DIR 环境变量(绝对路径),否则使用项目根目录 game_assets。
import { createReadStream } from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".js": "application/javascript",
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};
const DEFAULT_MIME = "application/octet-stream";

function assetsRoot(): string {
  const env = process.env.GAME_ASSETS_DIR;
  if (env) return path.resolve(env);
  return path.resolve(process.cwd(), "game_assets");
}

export default defineEventHandler(async (event) => {
  const raw = getRouterParam(event, "path");
  const rel = (Array.isArray(raw) ? raw.join("/") : String(raw || ""))
    .split("/")
    .filter(Boolean)
    .join("/");

  const root = assetsRoot();
  const target = path.resolve(root, rel);

  // 防目录穿越: 解析后的路径必须位于素材根目录之内
  if (target !== root && !target.startsWith(root + path.sep)) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden" });
  }

  let st;
  try {
    st = await fsp.stat(target);
  } catch {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }
  if (!st.isFile()) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }

  const ext = path.extname(target).toLowerCase();
  setResponseHeader(event, "Content-Type", MIME[ext] || DEFAULT_MIME);
  setResponseHeader(event, "Content-Length", String(st.size));
  setResponseHeader(event, "X-Content-Type-Options", "nosniff");
  // 素材基本不会变,允许长期缓存,避免每次进入游戏重复拉取大文件
  setResponseHeader(event, "Cache-Control", "public, max-age=31536000, immutable");

  return sendStream(event, createReadStream(target));
});