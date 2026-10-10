const path = require("node:path");

const common = {
  cwd: __dirname,
  autorestart: true,
  restart_delay: 5000,
  min_uptime: 30000,
  max_restarts: 10,
  kill_timeout: 12000,
  watch: false,
  time: true,
};

module.exports = {
  apps: [
    ...["api", "web"].map((role) => ({
      ...common,
      name: `afterbells-${role}`,
      script: path.join(__dirname, "scripts", "host-service.mjs"),
      interpreter: process.execPath,
      args: [role],
      shutdown_with_message: true,
      env: {
        AFTERBELLS_WSL_DISTRO: "Ubuntu",
        AFTERBELLS_HOST_ROOT: "/root/services/afterbells",
      },
    })),
    {
      ...common,
      name: "afterbells-tunnel",
      script: path.join(
        process.env["ProgramFiles(x86)"] || "C:/Program Files (x86)",
        "cloudflared",
        "cloudflared.exe",
      ),
      interpreter: "none",
      args: [
        "tunnel",
        "--no-autoupdate",
        "--config",
        path.join(process.env.USERPROFILE, ".cloudflared", "afterbells.yml"),
        "run",
      ],
    },
  ],
};
