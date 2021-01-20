/**
 * This is a core script that provides a hacky method to change the way command prefixes work.
 * 
 * It should be noted that when you type `/whatever` in the client, that is interpreted as a command, and thus
 * sends a command packet - which has different effects than a chat packet.
 * 
 * Regardless if you change the command, `/whatever` will still always register as a command. This is not fixable.
 */

function setPrefix(prefix) {
    Game.on("chat", (p, msg) => {
        if (msg.indexOf(prefix) === 0) {
            const args = msg.slice(1).trim().split(" ")
            const commandName = args.shift()
            return Game.emit("command", commandName, p, args.join(" "))
        }
        p.messageAll(msg)
    })
}

Game.chat = {
    setCommandPrefix: setPrefix
}