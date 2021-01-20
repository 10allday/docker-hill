import { resolve, basename } from "path"

import { EventEmitter } from "events"

const VERSION = require("../../package.json").version

export interface World {
    /** An array containing all the teams in the game. */
    teams: Array<Team>,
    /** An object containing various environment properties. */
    environment: Environment,
    /** An array containg all the bricks in the game. */
    bricks: Array<Brick>,
    /** An array containing bricks, when a player respawns it will choose a random position from a brick in this array. */
    spawns: Array<Brick>,
    /** An array containing all the bots in the game. */
    bots: Array<Bot>,
    /** An array of all the tools in the game. */
    tools: Array<Tool>,
}

export interface Disconnectable {
    /** Stops the event listener. */
    disconnect: () => {}
}

/** Weather types. */
export enum Weather {
    Sun = "sun" ,
    Rain = "rain",
    Snow = "snow",
}

/** Environment properties. */
export interface Environment {
    ambient: string,
    skyColor: string,
    baseColor: string,
    baseSize: number,
    sunIntensity: number,
    weather: Weather,
}

/** All data loaded / exported from a brk. */
export interface MapData {
    bricks: Array<Brick>,
    spawns: Array<Brick>,
    environment: Environment,
    tools: Array<Tool>,
    teams: Array<Team>,
}

enum GameEvents {
    InitialSpawn = "initialSpawn",
    PlayerJoin = "playerJoin",
    PlayerLeave = "playerLeave",
    Chatted = "chatted",
    Chat = "chat",
}

export class Game extends EventEmitter {
    /** 
   * Identical to player.on("initialSpawn").
   * @event
   * @example
   * ```js
   * Game.on("initialSpawn", (player) => {
   *    // "player" is now fully loaded.
    * })
    * ```
   */

  static readonly initialSpawn = GameEvents.InitialSpawn

    /** 
   * Fires immediately whenever a player joins the game. (Before player downloads bricks, players, assets, etc).
   * @event
   * @param player [Player]{@link Player}
   * @example
   * ```js
   * Game.on("playerJoin", (player) => {
   *    console.log("Hello: " + player.username)
   * })
   * ```
   */
    static readonly playerJoin = GameEvents.PlayerJoin

    /** 
   * Fires whenever a player leaves the game.
   * @event
   * @param player [Player]{@link Player}
   * @example
   * ```js
   * Game.on("playerLeave", (player) => {
   *    console.log("Goodbye: " + player.username)
   * })
   * ```
   */
    static readonly playerLeave = GameEvents.PlayerLeave

    /** 
   * Fires whenever any player chats in the game.
   * @event
   * @param player [Player]{@link Player}
   * @param message Message
   * @example
   * ```js
   * Game.on("chatted", (player, message) => {
   *    console.log(message)
   * })
   * ```
   */
    static readonly chatted = GameEvents.Chatted

    /** 
   * If a `Game.on("chat")` listener is added, any time the game recieves a chat message, it will be emitted data to this listener, and
   * the actual packet for sending the chat will not be sent.
   * 
   * You can use this to intercept chat messages, and then transform them to whatever, and then call `Game.messageAll`.
   * @event
   * @param player [Player]{@link Player}
   * @param message Message
   * @example
   * ```js
   * Game.on("chat", (player, message) => {
   *    Game.messageAll(player.username + " screams loudly: " + message)
   * })
   * ```
   */
    static readonly chat = GameEvents.Chat

    addListener(event: GameEvents.InitialSpawn, listener: (chunk: Buffer | string) => void): this;

    addListener(event: GameEvents.PlayerJoin, listener: (chunk: Buffer | string) => void): this;

    addListener(event: GameEvents.PlayerLeave, listener: (chunk: Buffer | string) => void): this;

    addListener(event: GameEvents.Chatted, listener: (chunk: Buffer | string) => void): this;

    addListener(event: GameEvents.Chat, listener: (chunk: Buffer | string) => void): this;

    addListener(event: GameEvents , listener: any): this { return super.addListener(event, listener); }

    /** @readonly An array of all currently in-game (and authenticated) players. */
    players: Array<Player>

    /** @readonly The package.json "version" of the node-hill library. **/
    version: string

    /** @readonly The gameId of the server. */
    gameId: number

    /** @readonly The port of the server. */
    port: number

    /** @readonly The map name of the server (ie: `Map.brk`) if a map is specified. */
    mapName?: string

    /** @readonly The full path of the hosted brk file (ie: `C:\\users\map\map.brk`) if a map is specified.*/
    map?: boolean | string

    /** @readonly The folder directory of where the server's user scripts are located. */
    userScripts: string

    /** @readonly If the server is currently running locally. */
    local: boolean

    /** @readonly If the files in user_script will be loaded recursively */
    recursiveLoading: boolean

    /**
     * This property is to compensate for a client bug. If the player team is
     * not set automatically, the user's name won't appear on their client's leaderboard.
     * 
     * Only disable this if you are going to set the player's team when they join.
     */
    assignRandomTeam: boolean = true

    /** If set to false, players will not spawn in the game. */
    playerSpawning: boolean = true

    /** If set to false, the bricks of the map will not be sent to the player when they join. But they will still be loaded into memory. */
    sendBricks: boolean = true

    /** An array of the core scripts disabled. (ie: `["respawn.js"]`).*/
    disabledCoreScripts: Array<string>

    /** A direct pointer to the server start settings (usually start.js) */
    serverSettings: GameSettings

    /** If set to false server join messages, etc will not be sent to players. */
    systemMessages: boolean = true
    
    /**
     * The message that will be sent to players (locally) who join the game.
     * 
     * @default [#14d8ff][NOTICE]: This server is proudly hosted with node-hill {@link version}.
     */
    MOTD: string

    /**
     * An object containing players, teams, environment settings, etc.
     * @global
     */
    world: World

    environment: Environment

    /** @readonly Returns the amount of (authenticated) players currently in the server. */
    playerCount: number

    /** @readonly An object containing a list of the modules loaded  server settings. */
    modules: Object

    constructor() {
        super()
    
        this.players = []

        this.version = VERSION

        this.disabledCoreScripts = []

        this.modules = {}

        this.assignRandomTeam = true

        this.sendBricks = true

        this.playerSpawning = true

        this.playerCount = 0

        this.systemMessages = true

        this.MOTD = `[#14d8ff][NOTICE]: This server is proudly hosted with node-hill ${this.version}.`

        this.world = {
            environment: {
                ambient: "#000000",
                skyColor: "#71b1e6",
                baseColor: "#248233",
                baseSize: 100,
                sunIntensity: 400,
                weather: Weather.Sun
            },

            teams: [],

            bricks: [],

            tools: [],

            spawns: [],

            bots: []
        }
    }

    /**  
     * Returns player stats in JSON from this API: \
     * https://api.brick-hill.com/v1/user/profile?id={userId}
     * 
    */
   async getUserInfo(userId: number): Promise<JSON> {
        return scripts.getUserInfo(userId)
    }

    /** Sends a chat message to every player in the game. */
    async messageAll(message: string) {
        return scripts.message.messageAll(message)
    }
    
    async topPrintAll(message: string, seconds: number) {
        return scripts.topPrintAll(message, seconds)
    }

    async centerPrintAll(message: string, seconds: number) {
        return scripts.centerPrintAll(message, seconds)
    }

    async bottomPrintAll(message: string, seconds: number) {
        return scripts.bottomPrintAll(message, seconds)
    }

    /** 
    * Commands are sent from the client when a user prefixes their message with `/` followed by any string. \
    * In the example below, "kick" would be the command, and "user" the argument: \
    * **Example**: `/kick user`
    * @callback
    * @example
    * ```js
    * Game.command("kick", (caller, args) => {
    *   if (caller.userId !== 2760) return // You're not dragonian!
    *   for (let player of Game.players) {
    *       if (player.username.startsWith(args)) {
    *           return player.kick("Kicked by Dragonian!")
    *       }
    *   }
    * })
    * ```
    */
    command(gameCommand: string, validator: (p, args, next: () => {}) => {}, callback?: () => {}): Disconnectable {
        const cmd = (cmd, p, args) => {
            if (cmd === gameCommand) {
                validator(p, args, callback)
            }
        }
        this.on("command", cmd)
        return {
            disconnect: () => this.off("command", cmd)
        }
    }

    /**
     * Identical to Game.command, but instead of a string it takes an array of commands.
     * 
     * This will assign them all to the same callback, this is very useful for creating alias commands.
     * @see {@link command}
     * @example
     * ```js
     * Game.commands(["msg", "message"], (p, args) => {
     *      Game.messageAll(args)
     * })
     * ```
     */
    commands(gameCommand: string[], validator: (p, args, next: () => {}) => {}, callback?: () => {}): Disconnectable {
        const cmd = (cmd, p, args) => {
            if (gameCommand.includes(cmd)) {
                validator(p, args, callback)
            }
        }
        this.on("command", cmd)
        return {
            disconnect: () => this.off("command", cmd)
        }
    }

    /** Returns the currently hosted sets data, if the game is being hosted by the provided userId - will throw an error 
     * if the userId provided is not the host.
     */
    async getThisSetDataFromHostId(userId: number) {
        const setData = await scripts.getSetDataFromUser(userId)

        for (let set of setData.data) {
            if (set.id === this.gameId)
                return set
        }

        throw new Error("userId provided is not the current host of this server.")
    }

    /** "Parents" a bot class to the game. **/
    async newBot(bot: Bot) {
        this.world.bots.push(bot)

        return scripts.botPacket(bot)
            .broadcast()
    }

    newBricks = this.loadBricks

    /** "Parents" a brick class to the game. You should do this after setting all the brick properties. */
    async newBrick(brick: Brick) {
        this.world.bricks.push(brick)

        const packet = new PacketBuilder(PacketEnums.SendBrick)

        scripts.addBrickProperties(packet, brick)

        return packet.broadcast()
    }

    /** Takes an array of bricks, and deletes them all from every client. This will modify world.bricks. */
    async deleteBricks(bricks: Brick[]) {
        let deletePacket = scripts.deleteBricks(bricks)

        for (let brick of this.world.bricks) {
            brick._cleanup()
            
            let index = this.world.bricks.indexOf(brick)
            if (index !== -1)
                this.world.bricks.splice(index, 1)
        }
    
        return deletePacket.broadcast()
    }

    /** Takes an array of teams and loads them to all clients.
     * @example
     * ```js
     * let teams = {
     *  redTeam: new Team("#f54242"),
     *  blueTeam: new Team("#0051ff")
     * }
     * 
     * Game.newTeams(Object.values(teams))
     * ```
     */
    newTeams(teams: Array<Team>) {
        this.world.teams = this.world.teams.concat(teams)
        for (let team of teams) {
            scripts.teamPacket.create(team)
                .broadcast()
        }
    }

    async newTeam(team: Team) {
        this.world.teams.push(team)

        return scripts.teamPacket.create(team)
            .broadcast()
    }

    /** Takes an array of bricks and loads them to all clients. */
    async loadBricks(bricks: Array<Brick>) {
        this.world.bricks = this.world.bricks.concat(bricks)

        return scripts.loadBricks(bricks)
            .broadcast()
    }

    /**
     * Sets the environment for every player in the game.
     * 
     * Patches the world.environment with keys containing new properties.
     * 
     * @example
     * ```js
     * Game.setEnvironment({ baseSize: 500 })
     * ```
     */
    async setEnvironment(environment: Partial<Environment>) {
        return scripts.setEnvironment(environment)
    }

    /**
     * Clears the map, and then calls loadBrk with the provided file path.
     * Then it sets all the bricks in the game, spawns, Game.map, and Game.mapName.
     * 
     * brk data like: bricks, spawns, environment, tools, teams, etc is returned.
     * 
     * @example
     * ```js
     * setTimeout(async() => {
     *      // Load all bricks + spawns in the game
     *      let data = await Game.loadBrk("./maps/headquarters2.brk")
     *  
     *      // Set the environment details (loadBrk does not do this).
     *      Game.setEnvironment(data.environment)
     * 
     *      // This brk added spawns, let's respawn players so they aren't trapped in a brick.
     *      Game.players.forEach((player) => {
     *          player.respawn()
     *      })
     * 
     *      console.log(data)
     * }, 60000)
     */
    async loadBrk(location: string): Promise<MapData> {
        const path = resolve(process.cwd(), location)
        if (!path.endsWith(".brk")) return Promise.reject("Map selected is not a .brk file. Aborting.")

        this.map = path
        this.mapName = basename(path)

        await this.clearMap()

        const brkData = scripts.loadBrk(path)
        this.world.bricks = brkData.bricks
        this.world.spawns = brkData.spawns

        const map = scripts.loadBricks(this.world.bricks)
        if (map) await map.broadcast()

        return brkData
    }

    /**
     * Loads the brk file like Game.loadBrk, but returns the data rather than setting / modifying anything.
     * 
     * This is useful if you want to grab teams, bricks, etc from a brk, but don't want to modify the game yet.
     */
    parseBrk(location: string): MapData {
        let path = resolve(process.cwd(), location)
        if (!path.endsWith(".brk")) throw new Error("Map selected is not a .brk file. Aborting.")

        return scripts.loadBrk(path)
    } 

    /**
     * Clears all of the bricks for every player connected. This wipes world.bricks, any new players who
     * join after this is ran will download no bricks from the server.
     */
    async clearMap() {
        for (let brick of this.world.bricks)
            brick._cleanup()

        this.world.bricks = []

        return new PacketBuilder(PacketEnums.ClearMap)
            .write("bool", true) // There's a bug with packets that contain no data.
            .broadcast()
    }

    /**
     * Exits the server process, and terminates any running scripts.
     * @see {@link https://nodejs.org/api/process.html#process_process_exit_code} for more information.
    */
    shutdown(status: number = 0) {
        return process.exit(status)
    }

    /** Return the distance between two points. */
    pointDistance3D(p1: Vector3, p2: Vector3): number {
        // ((x2 - x1)^2 + (y2 - y1)^2 + (z2 - z1)^2)^1/2
        return Math.sqrt((Math.pow(p1.x-p2.x,2))+(Math.pow(p1.y-p2.y,2))+(Math.pow(p1.z-p2.z,2)))
    }

    /** Find the player with the provided username, and return them. */
    findPlayerWithName(name: string): Player {
        for (let player of this.players) {
            if (player.username === name) {
                return player
            }
        }
    }

    /**@hidden */
    async _newPlayer(p) {
        p.socket.player = p
        p.authenticated = true

        this.playerCount++
        this.players.push(p)
        
        this.emit("playerJoin", p)

        await p._joined().catch(console.error)

        this.emit("initialSpawn", p)
    }

    /**@hidden */
    async _playerLeft(p) {
        if (p.authenticated) {
            let index = this.players.indexOf(p)
            this.players.splice(index, 1)

            this.playerCount--
            this.emit("playerLeave", p)

            await p._left()
        }
    }
}

export default new Game()

import Player from "./Player"

import Team from "./Team"

import * as scripts from "../scripts"

import Brick from "./Brick"

import Bot from "./Bot"

import PacketBuilder, { PacketEnums } from "../net/PacketBuilder"

import Vector3 from "./Vector3"

import Tool from "./Tool"

import { GameSettings } from ".."
