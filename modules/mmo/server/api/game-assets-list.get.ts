// game-assets-list.get.ts —— 枚举游戏素材文件列表（运行时）
// 用途: 页面(角色生成器/图集编辑器)不再用 import.meta.glob 把素材打进构建包,
//       而是启动时调用本接口拿到全部素材的相对路径,再通过 /api/game-assets/* 按需加载。
// 素材根目录解析与 game-assets/[...path] 一致(根目录 game_assets)。
import { promises as fsp } from "node:fs";
import path from "node:path";

function assetsRoot(): string {
  const env = process.env.GAME_ASSETS_DIR;
  if (env) return path.resolve(env);
  return path.resolve(process.cwd(), "game_assets");
}

export default defineEventHandler(async (event) => {
  // dir: 限定扫描的子目录(相对素材根,如 mmo/generator),缺省扫描整个素材根
  const rawDir = (getQuery(event).dir || "") as string;
  const dir = String(rawDir)
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter(Boolean)
    .join("/");

  const root = assetsRoot();
  const base = dir ? path.resolve(root, dir) : root;
  // 防目录穿越
  if (base !== root && !base.startsWith(root + path.sep)) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden" });
  }

  const files: string[] = [];
  const walk = async (d: string) => {
    let entries;
    try {
      entries = await fsp.readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const en of entries) {
      if (en.name.startsWith(".")) continue;   // 跳过 .DS_Store 等隐藏文件
      const p = path.join(d, en.name);
      if (en.isDirectory()) await walk(p);
      else if (en.isFile()) files.push(path.relative(root, p).split(path.sep).join("/"));
    }
  };
  await walk(base);

  return { root: "/api/game-assets/", files };
});
