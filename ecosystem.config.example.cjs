module.exports = {
  apps: [
    {
      name: "nuxt_lms_2026",
      script: "npm",
      args: "run server",
      instances: "1",
      exec_mode: "fork",
      env: {
        nitro_port: 80,
        nitro_host: "0.0.0.0",
      },
    },
  ],
};
