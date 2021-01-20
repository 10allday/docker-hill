const Game = require("../class/Game").default

const phin = require("phin")
    .defaults({
        url: "https://www.brick-hill.com/API/games/postServer",
        method: "POST",
        timeout: 12000 
    })

async function postServer() {
    try {
        let data = await phin({
            form: {
                "set": Game.gameId,
                "port": Game.port,
                "players": Game.players.length
            }
        })
        try {
            let body = JSON.parse(data.body)
            if (body.error) {
                console.warn("Failure while posting to games page:", JSON.stringify(body))
                return process.exit(0)
            }
        } catch (err) {} // It was successful (?)
    } catch (err) {
        console.warn("Error while posting to games page.")
        console.error(err.stack)
    }
}

module.exports = postServer
