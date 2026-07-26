module.exports = {
  apps: [{
    name: "automatic-assistant",
    cwd: "/www/wwwroot/automatic-assistant/server",
    script: "src/index.js",
    interpreter: "node",
    instances: 1,
    exec_mode: "fork",
    autorestart: true,
    max_memory_restart: "500M",
    env: {
      NODE_ENV: "production",
      HOST: "127.0.0.1",
      PORT: "3217",
      TRUST_PROXY: "1"
    }
  }]
};
