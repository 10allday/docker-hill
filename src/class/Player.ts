import { Socket } from "net"
import { EventEmitter } from "events"

import Game, { Environment, Disconnectable } from "./Game"
import Team from "./Team"
import Brick from "./Brick"
import * as scripts from "../scripts"

import PacketBuilder, { PacketEnums } from "../net/PacketBuilder"
import createPlayerIds from "../net/BrickHillPackets/playerIds"

import Vector3 from "./Vector3"
import Outfit from "./Outfit"
import Tool from "./Tool"

import { KeyTypes } from "../util/keys/whitelisted"
import { assert } from "console"

export enum CameraType {
    /**The camera is fixed in place. You can set the position of it. */
    Fixed = "fixed",
    /**The camera is orbiting the cameraObject (a player). You cannot set the position of it. */
    Orbit = "orbit",
    /**The camera is free-floating, the player can move it with WASD. (Glitchy and really bad). */
    Free = "free",
    /**The player's camera is locked in first person. */
    First = "first",
}

export interface BodyColors {
    head: string,
    torso: string,
    leftArm: string,
    rightArm: string,
    leftLeg: string,
    rightLeg: string,
}

export interface Assets {
    tool: number,
    face: number,
    hat1: number,
    hat2: number,
    hat3: number,
}

enum PlayerEvents {
    InitialSpawn = "initialSpawn",
    Died = "died",
    Respawn = "respawn",
    AvatarLoaded = "avatarLoaded",
    Chatted = "chatted",
    Moved = "moved",
}

export default class Player extends EventEmitter {
    /** 
   * Fires once when the player fully loads. (camera settings, map loads, players downloaded, etc).
   * @event
   * @example
   * ```js
   * Game.on("playerJoin", (player) => {
    *    player.on("initialSpawn", () => {
    *        player.prompt("Hello there!")
    *    })
    * })
    * ```
   */

  static readonly initialSpawn = PlayerEvents.InitialSpawn

    /** 
   * Fires whenever a player dies (health set to 0).
   * @event
   * @example
   * ```js
   * Game.on("playerJoin", (player) => {
    *    player.on("died", () => {
    *        player.kick("This is a hardcore server.")
    *    })
    * })
    * ```
   */

    static readonly died = PlayerEvents.Died

    /** 
   * Fires whenever a player spawns (respawn() is called.)
   * @event
   * @example
   * ```js
   * Game.on("playerJoin", (player) => {
   *    player.on("respawn", () => {
   *        player.setHealth(1000)
   *    })
   * })
   * ```
   */

    static readonly respawn = PlayerEvents.Respawn

    /** 
   * Fires whenever a player's outfit loads.
   * @event
   * @example
   * ```js
   * Game.on("playerJoin", (player) => {
   *    player.on("avatarLoaded", () => {
   *        // The outfit is now loaded.
   *    })
   * })
   * ```
   */

    static readonly avatarLoaded = PlayerEvents.AvatarLoaded

    /** 
   * Fires whenever the player chats. Functionality-wise this behaves like `Game.on("chatted")`.
   * @event
   * @param message Message
   * @example
   * ```js
   * Game.on("playerJoin", (player) => {
   *    player.on("chatted", (message) => {
   *        // The player chatted.
   *    })
   * })
   * ```
   */
    static readonly chatted = PlayerEvents.Chatted

    /**
     * Fires whenever this player moves.
     * @event
     * @param newPosition The new position of the player
     * @param newRotation The new rotation of the player
     * ```js
     * player.on("moved", (newPosition, newRotation)=>{
     *    console.log(`${player.username} moved to ${newPosition.x}, ${newPosition.y}, ${newPosition.z}`)
     * })
     */
    static readonly moved = PlayerEvents.Moved

    addListener(event: PlayerEvents.InitialSpawn, listener: (chunk: Buffer | string) => void): this;

    addListener(event: PlayerEvents.Died, listener: (chunk: Buffer | string) => void): this;

    addListener(event: PlayerEvents.Respawn, listener: (chunk: Buffer | string) => void): this;

    addListener(event: PlayerEvents.AvatarLoaded, listener: (chunk: Buffer | string) => void): this;

    addListener(event: PlayerEvents.Chatted, listener: (chunk: Buffer | string) => void): this;

    addListener(event: PlayerEvents.Moved, listener: (chunk: Buffer | string) => void): this;

    addListener(event: PlayerEvents , listener: any): this { return super.addListener(event, listener); }

    readonly socket: Socket & { player: Player }

    readonly authenticated: boolean

    readonly netId: number

    private _steps: Array<NodeJS.Timeout>

    /** The Brick Hill userId of the player. */
    readonly userId: number

    /** If the player is a Brick Hill admin (Does not work if local is set to true.)*/
    readonly admin: boolean

    /** The username of the player.*/
    readonly username: string

    /** The membershipType of the player. */
    readonly membershipType: number

    /** True if the player has left the game. */
    destroyed: boolean = false

    /** The current position of the player. */
    position: Vector3

    /** The current rotation of the player. */
    rotation: Vector3

    /** The scale of the player. */
    scale: Vector3 = new Vector3(1, 1, 1)

    /** The camera field of view of the player. */
    cameraFOV: number

    /** The distance of how far the camera is away from the player. */
    cameraDistance: number

    /** Where the player's camera is currently positioned. */
    cameraPosition: Vector3

    /** The rotation of the player's camera. */
    cameraRotation: Vector3

    /** The current camera type of the player. */
    cameraType: CameraType

    /** The player the camera is currently attached to. */
    cameraObject: Player

    /** An object containing all of the body colors the player has. */
    colors: BodyColors
    
    /** An object containing all of the assets the player is currently wearing. */
    assets: Assets

    /** An array containing userIds of players the player has blocked. Do NOT store player references in here. **/
    blockedUsers: Array<number>

    /** The value the player's health will be set to when they respawn. **/
    maxHealth: number = 100

    /** The current health of the player. */
    health: number

    /** If the player is alive or not. */
    alive: boolean

    /** If set to true, the server will reject any chat attempts from the player. **/
    muted: boolean = false

    /** The current speed of the player. */
    speed: number = 4

    /** How high the player can jump. */
    jumpPower: number = 5

    /** The current score of the player. */
    score: number = 0

    /** The current speech bubble of the player. ("" = empty). */
    speech: string = ""

    /** The current team the player is on. */
    team: Team

    /** An array of tools the player has in their inventory. */
    inventory: Array<Tool>

    /** The current tool the player has equipped. */
    toolEquipped: Tool

    /** If set, the player's nametag color (in chat) will be set to the hex value you put. */
    chatColor: string

    /** If set to false, the player will not automatically load their avatar. */
    loadAvatar: boolean = true

    /** If set to false, the player will not spawn with their tool equipped. \
     * loadAvatar MUST be enabled for this to work.*/
    loadTool: boolean = true

    /**
     * If set, player.respawn() will spawn the player in the value provided instead of a random location.
     * This property overrides spawnHandler.
     * @see {@link respawn}
     */
    spawnPosition?: Vector3

    /**
     * A function that will be called whenever player.respawn() is called.
     */
    spawnHandler: (player: Player) => Vector3

    /** An array containing all local bricks on the player's client. */
    localBricks?: Array<Brick>

    static playerId: number = 0

    constructor(socket) {
        super()

        Player.playerId += 1

        this.socket = socket

        this.netId = Player.playerId

        this.localBricks = []

        this._steps = []

        this.inventory = []

        this.blockedUsers = []

        this.destroyed = false

        this.spawnHandler = scripts.pickSpawn

        this.position = new Vector3(0, 0, 0)

        this.rotation = new Vector3(0, 0, 0)

        this.scale = new Vector3(1, 1, 1)

        this.cameraFOV = 60

        this.cameraDistance = 5

        this.cameraPosition = new Vector3(0, 0, 0)

        this.cameraRotation = new Vector3(0, 0, 0)

        this.cameraType = CameraType.Fixed

        this.cameraObject = this

        this.colors = {
            head: "#d9bc00",
            torso: "#d9bc00",
            leftArm: "#d9bc00",
            rightArm: "#d9bc00",
            leftLeg: "#d9bc00",
            rightLeg: "#d9bc00",
        }

        this.assets = {
            tool: 0,
            face: 0,
            hat1: 0,
            hat2: 0,
            hat3: 0,
        }

        this.maxHealth = 100

        this.health = this.maxHealth

        this.alive = false

        this.muted = false

        this.speed = 4

        this.speech = ""

        this.jumpPower = 5

        this.score = 0

        this.toolEquipped = null
    }

    /** 
   * Calls back whenever the player clicks.
   * @callback
   * @example
   * ```js
   * player.mouseclick(() => {
   *    // The player clicked.
   * })
   * ```
   */
    mouseclick(callback: () => void): Disconnectable {
        let clickCallback = () => {
            callback()
        }
        this.on("mouseclick", clickCallback)
        return {
            disconnect: () => this.off("mouseclick", clickCallback)
        }
    }

    /** 
   * Calls back whenever the player presses a key.
   * @callback
   * @example
   * ```js
   * Game.on("initialSpawn", (player) => {
   *    player.speedCooldown = false
   * 
   *    player.keypress(async(key) => {
   *        if (player.speedCooldown) return
   *        if (key === "shift") {
   *            player.speedCooldown = true
   *            
   *            player.bottomPrint("Boost activated!", 3)
   *            
   *            player.setSpeed(8)
   * 
   *            await sleep(3000)
   * 
   *            player.setSpeed(4)
   * 
   *            player.bottomPrint("Boost cooldown...", 6)
   * 
   *            setTimeout(() => {
   *                player.speedCooldown = false
   *            }, 6000)
   *        }
   *    })
   * })
   * ```
   **/

    keypress(callback: (key: KeyTypes) => void): Disconnectable {
        let kpCallback = (key) => {
            callback(key)
        }
        this.on("keypress", kpCallback)
        return {
            disconnect: () => this.off("keypress", kpCallback)
        }
    }

    /**
     * Kicks the player from the game.
     * @param message The kick message
     */
    async kick(message: string) {
        return scripts.kick(this.socket, message)
    }
    
    /**
     * Clears all of the bricks for the player. This is a LOCAL change. \
     * world.bricks will not be updated!
     */
    async clearMap() {
        return new PacketBuilder(PacketEnums.ClearMap)
            .write("bool", true) // There's a bug with packets that contain no data.
            .send(this.socket)
    }

    private async _log(message: string, broadcast: boolean = false) {
        if (!Game.systemMessages) return
        
        if (broadcast)
            return scripts.message.messageAll(message)
        else
            return scripts.message.messageClient(this.socket, message)
    }

    private async _removePlayer() {
        return new PacketBuilder(PacketEnums.RemovePlayer)
            .write("uint32", this.netId)
            .broadcastExcept([this])
    }

    async topPrint(message: string, seconds: number) {
        return scripts.topPrint(this.socket, message, seconds)
    }

    async centerPrint(message: string, seconds: number) {
        return scripts.centerPrint(this.socket, message, seconds)
    }

    async bottomPrint(message: string, seconds: number) {
        return scripts.bottomPrint(this.socket, message, seconds)
    }

    /** Prompts a confirm window on the player's client. */
    async prompt(message: string) {
        return scripts.prompt(this.socket, message)
    }

    /**
     * Sends a local message to the player.
     * @param message The message
     */
    async message(message: string) {
        return scripts.message.messageClient(this.socket, message)
    }

    /** Sends a chat message to everyone, conforming to rate-limit / mute checks, etc. */
    async messageAll(message: string) {
        return scripts.message.clientMessageAll(this, message)
    }
    
    async setOutfit(outfit: Outfit) {
        // Patch assets + colors
        Object.assign(this.assets, outfit.assets)
        Object.assign(this.colors, outfit.colors)

        return createPlayerIds(this, outfit.idString)
            .broadcast()
    }

    /** Sets the players health. If the health provided is larger than maxHealth, maxHealth will automatically be \
     *  set to the new health value.
     */
    async setHealth(health: number) {
        if (health <= 0 && this.alive) {
            return this.kill()
        } else {
            if (health > this.maxHealth) this.maxHealth = health
            this.health = health
            return createPlayerIds(this, "e")
                .send(this.socket)
        }
    }

    async setScore(score: number) {
        if (isNaN(score)) throw 'Score must be a number.'

        this.score = Number(score)
        
        return createPlayerIds(this, "X")
            .broadcast()
    }

    async setTeam(team: Team) {
        this.team = team
        return createPlayerIds(this, "Y")
            .broadcast()
    }

    private _greet() {
        if (Game.MOTD) {
            this._log(Game.MOTD)
        }
        this._log(`\\c6[SERVER]: \\c0${this.username} has joined the server!`, true)
    }

    async setCameraPosition(position: Vector3) {
        this.cameraPosition = new Vector3().fromVector(position)
        return createPlayerIds(this, "567")
            .send(this.socket)
    }

    async setCameraRotation(rotation: Vector3) {
        this.cameraRotation = new Vector3().fromVector(rotation)
        return createPlayerIds(this, "89a")
            .send(this.socket)
    }

    async setCameraDistance(distance: number){ 
        this.cameraDistance = distance
        return createPlayerIds(this, "4")
            .send(this.socket)
    }

    async setCameraFOV(fov: number) {
        this.cameraFOV = fov
        return createPlayerIds(this, "3")
            .send(this.socket)
    }

    async setCameraObject(player: Player) {
        this.cameraObject = player
        return createPlayerIds(this, "c")
            .send(this.socket)
    }

    async setCameraType(type: CameraType) {
        this.cameraType = type
        return createPlayerIds(this, "b")
            .send(this.socket)
    }

    /** Returns an arary of all the players currently blocking this user. */
    getBlockedPlayers() {
        let players = []
    
        for (let target of Game.players) {
            if (target.blockedUsers.includes(this.userId))
                players.push(target)
        }

        return players
    }

    /** Adds the tool to the user's inventory. */
    async addTool(tool: Tool) {
        if (this.inventory.includes(tool))
            return Promise.reject("Player already has tool equipped.")
            
        this.inventory.push(tool)

        return scripts.toolPacket.create(tool)
            .send(this.socket)
    }

    /** Takes an array of bricks and loads them to the client locally. */
    async loadBricks(bricks: Array<Brick>) {
        return scripts.loadBricks(bricks)
            .send(this.socket)
    }

    /** Takes an array of bricks, and deletes them all from this client. */
    async deleteBricks(bricks: Brick[]) {
        return scripts.deleteBricks(bricks)
             .send(this.socket)
    }

    /** Forces the player to unequip the tool, and removes it from their inventory. */
    async destroyTool(tool: Tool) {
        const index = this.inventory.indexOf(tool)

        if (index === -1) return // Tool not found.

        this.inventory.splice(index, 1)

        return scripts.toolPacket.destroy(tool)
            .send(this.socket)
    }

    /** Equips the tool, if It's not already in the user's inventory it will be added first. \
     * If you call this on a tool that is already equipped, it will be unequipped.
     */
    async equipTool(tool: Tool) {
        // They don't have the tool, add it first.
        if (!this.inventory.includes(tool))
            await this.addTool(tool)

        let currentTool = this.toolEquipped

        // Tool is already equpped, unequip it.
        if (currentTool === tool)
            return this.unequipTool(tool)

        // The player switched tools, inform the other one it's unequipped.
        if (currentTool)
            currentTool.emit("unequipped", this)

        this.toolEquipped = tool

        tool.emit("equipped", this)

        return createPlayerIds(this, "g")
            .broadcast()
    }

    /** Unequips the tool from the player, but does not remove it from their inventory. */
    async unequipTool(tool: Tool) {
        this.toolEquipped = null
        
        tool.emit("unequipped", this)

        return createPlayerIds(this, "h")
            .broadcast()
    }
    
    async setSpeech(speech = "") {
        this.speech = speech

        return createPlayerIds(this, "f")
            .broadcastExcept(this.getBlockedPlayers())
    }

    async setSpeed(speedValue: number) {
        this.speed = speedValue
        return createPlayerIds(this, "1")
            .send(this.socket)
    }

    async setJumpPower(power: number) {
        this.jumpPower = power
        return createPlayerIds(this, "2")
            .send(this.socket)
    }

    private async _getClients() {
        // There are no other clients to get.
        if (Game.playerCount <= 1) return 

        // Send all other clients this client.
        await new PacketBuilder(PacketEnums.SendPlayers)
            .write("uint8", 1)
            .write("uint32", this.netId)
            .write("string", this.username)
            .write("uint32", this.userId)
            .write("uint8", this.admin)
            .write("uint8", this.membershipType)
            .broadcastExcept([this])

        let packet = new PacketBuilder(PacketEnums.SendPlayers)

        let count = 0

        // Send this client all other clients.
        for (let player of Game.players) {
            if (player !== this) {
                    packet.write("uint32", player.netId)
                    packet.write("string", player.username)
                    packet.write("uint32", player.userId)
                    packet.write("uint8", player.admin)
                    packet.write("uint8", player.membershipType)
                    count++
            }
        }
        if (count > 0) {
            packet.buffer.insertUInt8(count, 1)
            return packet.send(this.socket)
        }
    }

    /**@hidden */
    async _updatePositionForOthers(pos: Array<number>) {
        let idBuffer = ""

        if (pos[0] && this.position.x != pos[0]) {
            idBuffer += "A"
            this.position.x = pos[0]
        }

        if (pos[1] && this.position.y != pos[1]) {
            idBuffer += "B"
            this.position.y = pos[1]
        }

        if (pos[2] && this.position.z != pos[2]) {
            idBuffer += "C"
            this.position.z = pos[2]
        }

        if (pos[3] && this.rotation.z != pos[3] ) {
            idBuffer += "F"
            this.rotation.z = pos[3]
        }

        if (idBuffer.length) {
            this.emit("moved", this.position, this.rotation.z)

            return createPlayerIds(this, idBuffer)
                .broadcastExcept([this])
        }
    }

    /**Clones a brick locally to the player's client, returns the newly created local brick. */
    async newBrick(brick: Brick) {
        let localBrick = brick.clone()

        localBrick.socket = this.socket
        
        this.localBricks.push(localBrick)

        const packet = new PacketBuilder(PacketEnums.SendBrick)
        
        scripts.addBrickProperties(packet, localBrick)

        await packet.send(this.socket)

        return localBrick
    }

    async setPosition(position: Vector3) {
        this.position = new Vector3().fromVector(position)

        this.emit("moved", this.position, this.rotation.z)

        const packetBuilder = createPlayerIds(this, "ABCF")

        return packetBuilder.broadcast()
    }

    async setScale(scale: Vector3) {
        this.scale = new Vector3().fromVector(scale)

        const packetBuilder = createPlayerIds(this, "GHI")

        return packetBuilder.broadcast()
    }

    /**
     * Sets the appearance of the player. \
     * If a userId isn't specified, it will default to the player's userId.
     * 
     * Error handling is highly recommended as this function makes a HTTP request.
     */
    async setAvatar(userId: number) {
        await scripts.setAvatar(this, userId)
        let packet = createPlayerIds(this, "KLMNOPQUVW")
        return packet.broadcast()
    }

      /**
     * Returns player stats in JSON from this API: \
     * https://api.brick-hill.com/v1/user/profile?id={userId}
     * @example
     * ```js
     * Game.on("playerJoin", async(player) => {
     *  const data = await player.getUserInfo()
     *  console.log(data)
     * })
    * ```
     */
    async getUserInfo(): Promise<JSON> {
        return scripts.getUserInfo(this.userId)
    }

    /**
     * Returns true or false if the player owns a specified assetId.
     * 
     * @example
     * ```js
     * Game.on("initialSpawn", async(p) => {
     *      let ownsAsset = await p.ownsAsset(106530)
     *      console.log("Player owns asset: ", ownsAsset)
     * })
    ``` 
     */
    async ownsAsset(assetId: number): Promise<boolean> {
        return scripts.playerOwnsAsset(this.userId, assetId)
    }

    /**
     * Returns JSON data of the users rank in a group, or false if they aren't in the group. \
     * https://api.brick-hill.com/v1/clan/member?id=1&user=1
     * @example
     * ```js
     * Game.on("playerJoin", async(player) => {
     *  const groupData = await player.getRankInGroup(5)
     *  if (groupData) {
     *      console.log(groupData)
     *  } else {
     *      console.log("Player is not in group.")
     *  }
     * })
    * ```
     */
    async getRankInGroup(groupId: number): Promise<JSON | boolean> {
        return scripts.getRankInGroup(groupId, this.userId)
    }

    async kill() {
        this.alive = false

        this.health = 0

        await new PacketBuilder(PacketEnums.Kill)
            .write("float", this.netId)
            .write("bool", true)
            .broadcast()

        await createPlayerIds(this, "e")
            .send(this.socket)
            
        this.emit("died")
    }

    /** Respawns the player. */
    async respawn() {
        let newSpawnPosition;

        if (this.spawnPosition) {
            newSpawnPosition = this.spawnPosition
        } else {
            newSpawnPosition = await this.spawnHandler(this) || scripts.pickSpawn()
        }

        await this.setPosition(newSpawnPosition)

        await new PacketBuilder(PacketEnums.Kill)
            .write("float", this.netId)
            .write("bool", false)
            .broadcast()

        this.alive = true

        this.health = this.maxHealth

        this.cameraType = CameraType.Orbit

        this.cameraObject = this
        
        this.cameraPosition = new Vector3(0, 0, 0)

        this.cameraRotation = new Vector3(0, 0, 0)

        this.cameraFOV = 60

        this.toolEquipped = null

        await createPlayerIds(this, "ebc56789a3h")
            .send(this.socket)

        this.emit("respawn")
    }

    /**
     * Identical to setInterval, but will be cleared after the player is destroyed.
     * Use this if you want to attach loops to players, but don't want to worry about clearing them.
     * @param callback The callback function.
     * @param delay The delay in milliseconds.
     */
    setInterval(callback, delay: number): NodeJS.Timeout {
        let loop = setInterval(callback, delay)
        this._steps.push(loop)
        return loop
    }

    /**
     * Functionally the same to Game.setEnvironment, but sets the environment only for one player.
     * @example
     * ```js
     * Game.on("playerJoin", (p) => {
     *  p.setEnvironment( {skyColor: "6ff542"} )
     * })
     */
    async setEnvironment(environment: Partial<Environment>) {
        return scripts.setEnvironment(environment, this.socket)
    }

    private _createFigures() {
        // Update player's figure for others
        createPlayerIds(this, "ABCDEFGHIKLMNOPQUVWXYfg")
            .broadcastExcept([this])
        // Update other figures for this player
        for (let player of Game.players) {
            if (player !== this) {
                createPlayerIds(player, "ABCDEFGHIKLMNOPQUVWXYfg")
                    .send(this.socket)
            }
        }
    }

    private _createTeams() {
        for (let team of Game.world.teams) {
            scripts.teamPacket.create(team)
                .send(this.socket)
        }
    }

    private _createBots() {
        for (let bot of Game.world.bots) {
            scripts.botPacket(bot)
                .send(this.socket)
        }
    }

    /**@hidden */
    async _left() {
        console.log(`${this.username} has left the game.`)

        await this._removePlayer()

        this._log(`\\c6[SERVER]: \\c0${this.username} has left the server!`, true)

        this.removeAllListeners()

        this._steps.forEach((loop) => {
            clearInterval(loop)
        })

        this.destroyed = true
    }

    /**@hidden */
   async _joined() {
        // Send player their information + brick count.
        await scripts.sendAuthInfo(this)

        await this._getClients()

        console.log(`${this.username} has joined | netId: ${this.netId}`)

        this._greet()

        await this.setEnvironment(Game.world.environment)

        if (Game.sendBricks) {
            let map = scripts.loadBricks(Game.world.bricks)
            if (map) await map.send(this.socket)
        }

        this._createTeams()

        this._createBots()

        if (Game.assignRandomTeam && Game.world.teams.length)
            this.setTeam(Game.world.teams[Math.floor(Math.random() * Game.world.teams.length)])

        if (Game.playerSpawning)
            await this.respawn()

        this._createFigures()

        if (this.loadAvatar) {
            await this.setAvatar(this.userId)
                .then(() => { 
                    this.emit("avatarLoaded")
                })
                .catch((err) => {
                    console.error(`Failure loading avatar appearance for ${this.username}: \n`, err.stack)
                })
            if (this.loadTool && this.assets.tool) {
                const tool = new Tool("Tool")
                tool.model = this.assets.tool
                await this.addTool(tool)
            }
        }

        this.mouseclick(() => {
            this.toolEquipped && this.toolEquipped.emit("activated", this)
        })
        
        this.emit("initialSpawn")
    }
}