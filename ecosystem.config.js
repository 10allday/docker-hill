// ecosystem.config.js
const os = require('os');
module.exports = {
    apps: [
         {
            port        : 80,
            name        : "colyseus-proxy",
            script      : "./node_modules/@colyseus/proxy/bin/proxy",
            instances   : 1, // scale this up if the proxy becomes the bottleneck
            exec_mode   : 'cluster',
            env: {
                PORT: 80,
                REDIS_URL: "redis://127.0.0.1:6379/0"
            }
        },
        {
            port        : 8080,
            name        : "colyseus",
            script      : "lib/index.js", // your entrypoint file
            watch       : true,           // optional
            instances   : os.cpus().length,
            exec_mode   : 'fork',         // IMPORTANT: do not use cluster mode.
            env: {
                DEBUG: "colyseus:errors",
                NODE_ENV: "production",
            }
        }
    ]
}
