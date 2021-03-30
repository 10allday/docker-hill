const nh = require('node-hill')

nh.startServer({
    gameId: 0, // Your game id here

    port: 42480, // Your port id here (default is 42480)

    local: false, // Whether or not your server is local

    map: './maps/docker.brk', // Your .brk file path

    scripts: './user_scripts', // Your .js files path

    // Add npm / built-in node.js modules here
    modules: [
        //"discord.js"
    ]
})

// For more help: https://brickhill.gitlab.io/open-source/node-hill/interfaces/gamesettings.html
