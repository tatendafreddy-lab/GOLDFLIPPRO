module.exports = {
  apps: [
    {
      name: "goldflip-bot",
      script: "server/bot.js",
      watch: false,
      restart_delay: 5000,
      max_restarts: 50,
      env: {
        NODE_ENV: "production"
      },
      log_file: "server/logs/combined.log",
      error_file: "server/logs/error.log",
      out_file: "server/logs/out.log"
    }
  ]
};
