module.exports = {
  apps: [
    {
      name: "nuxt_lms_2026",
      script: "npm",
      args: "run server",
      instances: "1",
      exec_mode: "fork",
      env: {
        NITRO_PORT: 80,
        NITRO_HOST: "0.0.0.0",
      },
    },
  ],
};
