module.exports = {
  apps: [
    {
      name: "nuxt_lms_2026",
      // 集群模式：instances="max" 按 CPU 核数起多个 worker，共享 NITRO_PORT 端口，
      // 让 Nuxt SSR 用满多核（单进程只能吃一核，并发饱和点很低）。
      script: "node",
      args: ".output/server/index.mjs",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NITRO_PORT: 80,
        NITRO_HOST: "0.0.0.0",
      },
    },
  ],
};
