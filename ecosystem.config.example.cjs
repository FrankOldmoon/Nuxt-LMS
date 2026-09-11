/**
 * 生产部署：Nuxt/Nitro 多实例 + nginx 反向代理，对外只暴露 80。
 *
 * 为什么不用 PM2 cluster：Nitro 的 server 不支持 cluster 共享单一端口，
 * 多 worker 各自 `listen` 同一个 NITRO_PORT 会因 EADDRINUSE 崩溃。
 * 正确做法是「多进程各监听不同端口 + 前面用 nginx 做负载均衡」。
 */
module.exports = {
  apps: (() => {
    const nodes = [];
    for (let i = 1; i <= 8; i++) {
      nodes.push({
        name: `nuxt_${3000 + i}`,
        script: ".output/server/index.mjs",
        args: "",
        instances: 1,
        exec_mode: "fork",
        cwd: "/www/wwwroot/nuxt_lms_2026",
        env: {
          NITRO_HOST: "127.0.0.1", // 只对内，由 nginx 转发
          NITRO_PORT: String(3000 + i),
        },
        max_memory_restart: "1200M",
        error_file: `/root/.pm2/logs/nuxt_${3000 + i}-error.log`,
        out_file: `/root/.pm2/logs/nuxt_${3000 + i}-out.log`,
      });
    }
    return nodes;
  })(),
};