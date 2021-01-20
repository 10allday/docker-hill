const PacketBuilder = require("../../net/PacketBuilder").default

const filterModule = require("../../util/filter/filterModule").default

const Game = require("../../class/Game").default

const generateTitle = require("../../util/chat/generateTitle").default

const formatHex = require("../../util/color/formatHex").default

const rateLimit = new Set()

function clientMessageAll(p, message) {
    if (p.muted)
        return p.message("You are muted.")

    if (rateLimit.has(p.userId))
        return p.message("You're chatting too fast!")

    if (message.length > 85)
        message = message.substring(0, 85) + "..."

    rateLimit.add(p.userId)
    setTimeout(() => rateLimit.delete(p.userId), 2000)

    if (filterModule.isSwear(message))
        return p.message("Don't swear! Your message has not been sent.")

    console.log(`${p.username}: ${message}`)

    Game.emit("chatted", p, message)

    p.emit("chatted", message)

    const fullMessage = generateTitle(p, message)

    return new PacketBuilder("Chat")
        .write("string", fullMessage)
        .broadcastExcept(p.getBlockedPlayers())
}

function messageAll(message) {
    message = formatHex(message)

    return new PacketBuilder("Chat")
        .write("string", message)
        .broadcast()
}

function messageClient(socket, message) {
    message = formatHex(message)

    return new PacketBuilder("Chat")
        .write("string", message)
        .send(socket)
}

module.exports = { messageAll, messageClient, clientMessageAll }