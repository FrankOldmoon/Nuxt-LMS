// mmo-colyseus.ts —— 在 Nuxt 进程内启动 Colyseus 服务器（默认 2567 端口）
// 与 Nuxt 共享进程，无需单独起服务器；端口可用 MMO_WS_PORT 环境变量覆盖。
// 开发模式 Nitro 热重载会重新执行插件，故加端口占用检测：已在监听则跳过，避免 EADDRINUSE。
import { defineNitroPlugin } from "nitropack/runtime";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import express from "express";
import colyseus from "colyseus";
import { GameRoom } from "../colyseus/GameRoom";

const { Server } = colyseus;

declare global {
  var __mmoColyseusStarted: boolean | undefined;
}

// 检测端口是否已被占用（避免热重载重复启动）
function portInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const s = net.createConnection({ port, host: "127.0.0.1" });
    s.once("connect", () => { s.destroy(); resolve(true); });
    s.once("error", () => resolve(false));
  });
}

// 获取本机局域网 IPv4 地址（供日志提示）
function lanIPv4(): string {
  try {
    for (const list of Object.values(os.networkInterfaces())) {
      for (const it of list || []) {
        if (it.family === "IPv4" && !it.internal) return it.address;
      }
    }
  } catch { /* ignore */ }
  return "127.0.0.1";
}

export default defineNitroPlugin(async () => {
  if (globalThis.__mmoColyseusStarted) return;
  globalThis.__mmoColyseusStarted = true;

  const PORT = Number(process.env.MMO_WS_PORT || 2567);
  // 绑定 0.0.0.0，开放局域网访问
  const HOST = "0.0.0.0";

  // 若端口已被本进程/其它实例占用（如热重载残留），直接复用，不再重复监听
  if (await portInUse(PORT)) {
    console.log(`[mmo] Colyseus already listening on :${PORT}, skip`);
    return;
  }

  // 复用原始 Colyseus 启动方式：express 处理普通 HTTP，Colyseus 拦截 /matchmake 与 WS 升级
  const app = express();
  app.use(express.json());
  const httpServer = http.createServer(app);

  const gameServer = new Server({ server: httpServer });
  // 按 classId 过滤：每个班级独立房间，玩家只进自己 default_class 的房间
  (gameServer.define("game", GameRoom) as any).filterBy(["classId"]);

  httpServer.on("error", (e: any) => {
    console.error("[mmo] Colyseus http server error:", e && e.message);
  });

  httpServer.listen(PORT, HOST, () => {
    console.log(`[mmo] Colyseus listening at ws://${HOST}:${PORT} (LAN: ws://${lanIPv4()}:${PORT})`);
  });

  process.once("exit", () => {
    try { httpServer.close(); } catch { /* ignore */ }
  });
});

