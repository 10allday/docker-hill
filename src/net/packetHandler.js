// Dependencies
let SmartBuffer = require("smart-buffer").SmartBuffer

let zlib = require("zlib")

// Import utilities
let uintv = require("./uintv")

// Game objects
let Game = require("../class/Game").default

let Player = require("../class/Player").default

let generateTitle = require("../util/chat/generateTitle").default

let scripts = require("../scripts")

let { whiteListedKey } = require("../util/keys/whitelisted")

let checkAuth = require("../api/checkAuth")

async function handlePacketType(type, socket, reader) {
    let player = socket.player

    if (type !== 1 && !player) return

    switch (type) {
        /* <Authentication handler> */
        case 1: {
            if (socket._attemptedAuthentication) return socket.destroy()

            socket._attemptedAuthentication = true

            const [ USER, ERR ] = await checkAuth(socket, reader)

            // User could not authenticate properly.
            if (!USER || ERR) {
                console.log(`<Client: ${socket.IP}> Failed verification.`)
                return scripts.kick(socket, ERR || "Server error.")
            }
    
            // Check if the users socket is still active after authentication.
            if (socket.destroyed) return

            // Check if player is already in game + kick them if so.
            for (let player of Game.players) {
                if (player.userId === USER.userId)
                    return scripts.kick(socket, "You can only join this game once per account.")
            }

            const authUser = new Player(socket)

            // Make properties readonly.
            Object.defineProperties(authUser, {
                userId: { value: USER.userId },
                username: { value: USER.username },
                admin: { value: USER.admin },
                membershipType: { value: USER.membershipType },
                brickplayer: { value: USER.brickplayer }
            })

            console.log(`Successfully verified! (Username: ${authUser.username} | ID: ${authUser.userId} | Admin: ${authUser.admin})`)

            // Finalize the player joining process.
            Game._newPlayer(authUser)
            
            break
        }
        /* <Player position handler> */
        case 2: {
            let xpos,
                ypos,
                zpos,
                zrot;
            try {
                xpos = reader.readFloatLE()
                ypos = reader.readFloatLE()
                zpos = reader.readFloatLE()
                zrot = reader.readFloatLE()
            } catch (err) {
                return false // Drop the packet
            }
            player._updatePositionForOthers([
                xpos, ypos, zpos, zrot
            ])
            break
        }
        /* <Command handler> */
        case 3: {
            let command, args;

            try {
                command = reader.readStringNT()
                args = reader.readStringNT()
            } catch (err) {
                return false
            }

            if (command !== "chat")
                return Game.emit("command", command, player, args)

            // The host wants to manage chat on their own
            if (Game.listeners("chat").length)
                return Game.emit("chat", player, args, generateTitle(player, args))
            
            player.messageAll(args)
 
            break
        }
        /* <Projectile handler> */
        case 4: {
            break
        }
        /* <Brick click detection handler> */
        case 5: {
            try {
                const brickId = reader.readUInt32LE()

                // Check for global bricks with that Id.
                const brick = Game.world.bricks.find(brick => brick.netId === brickId)
                if (brick && brick.clickable) 
                    return brick.emit("clicked", player)

                // The brick might be local.
                const localBricks = player.localBricks
                const localBrick = localBricks.find(brick => brick.netId === brickId)

                if (localBrick && localBrick.clickable)
                    return localBrick.emit("clicked", player)
            } catch (err) {
                return false
            }
            break
        }
        /* <Player key + mouse input handler> */
        case 6: {
            try {
                let click = Boolean(reader.readUInt8())
                let key = reader.readStringNT()

                if (click) player.emit("mouseclick")

                if (key && whiteListedKey.includes(key))
                    player.emit("keypress", key)
            } catch (err) {
                return false
            }
            break
        }
    }
}

async function packetHandler(socket, rawBuffer) {
    const packets = []

    if (rawBuffer.length <= 1) return;

    (function readMessages(buffer) {
        const { messageSize, end } = uintv.readUIntV(buffer)
        if (end >= buffer.length) return

        const packet = buffer.slice(end)

        packets.push(packet.slice(0, messageSize))

        if (packet.length > messageSize)
            return readMessages(packet.slice(messageSize))
    })(rawBuffer)

    packets.forEach((packet) => {
        // Uncompress the packet if it is compressed.
        try {
            packet = zlib.inflateSync(packet)
        } catch (err) {}

        const reader = SmartBuffer.fromBuffer(packet)

        // Check for the packet type
        let type
        try {
            type = reader.readUInt8()
        } catch (err) {}

        // Packet type was invalid
        if (!type) return

        handlePacketType(type, socket, reader)
    })
}

module.exports = { packetHandler }