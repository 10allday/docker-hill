// Node + npm modules
import { resolve, basename } from "path"
import { promisify } from "util"
import { NodeVM, NodeVMOptions } from "vm2"
import * as fs from "fs"
import glob from "glob"

// Have to use require here because phin doesn't support .defaults with TS
const phin = require("phin")
    .defaults({"parse": "json", "timeout": 12000})

// VM Classes
import Game from "./class/Game"
import Team from "./class/Team"
import Brick from "./class/Brick"
import Bot from "./class/Bot"
import PacketBuilder from "./net/PacketBuilder"
import Vector3 from "./class/Vector3"
import { loadBrk } from "./scripts"
import Tool from "./class/Tool"
import Outfit from "./class/Outfit"

// Utility methods
import color, { colorModule }  from "./util/color/colorModule"
import filter, { filterModule } from "./util/filter/filterModule"
import serializer, { serializerModule } from "./util/serializer/serializerModule"

const NPM_LATEST_VERSION = "https://registry.npmjs.org/node-hill/latest"

const CORE_DIRECTORY = resolve(__dirname, "./core_scripts")

export interface Utilities  {
    filter: filterModule
    serializer: serializerModule
    color: colorModule
}

/**
 * Contains all the global variables that are copied into the VM.
 */
export interface VM_GLOBALS {
    /**@global */
    Game: typeof Game

    /**
     * @global
     * Shortcut to {@link Game.world}
     * */
    world: typeof Game.world

    /** @global */
    Team: typeof Team

    /** @global */
    Tool: typeof Tool

    /** @global */
    Brick: typeof Brick

    /** @global */
    Bot: typeof Bot

    /** @global
     * Used for setting or reading object positions / scale / etc.
    */
    Vector3: typeof Vector3

    /**@global
     * Used for setting a player / bot's body colors + assets.
     */
    Outfit: typeof Outfit

    /** @global 
     * Used internally by the library to create and distribute Brick Hill legacy client-compatible packets. \
     * This is intended for advanced users, but allows you to have complete control over the client.
    */
    PacketBuilder: typeof PacketBuilder

    /** @global
     * Will eventually contain handy functions. But for now only contains randomHexColor().
     */
    util: Utilities

    /**
     * A promisified version of setTimeout, useful for writing timeouts syncronously.
     * @global
     * @example
     * ```js
     * Game.on("playerJoin", async(player) => {
     *  player.message("After 5 seconds, you're gone!")
     *  await sleep(5000)
     *  player.kick("Time's up!")
     * })
     */
    sleep: Promise<void>

    /**
     * Used for locking functions until a specified time has passed.
     * @global
     * @example
     * ```js
     * Game.on("playerJoin", (player) => {
     *    player.on("mouseclick", debounce(() => {
     *        console.log("You clicked! But now you can't for 5 seconds.")
     *    }, 5000))
     * })
     * ```
     */
    debounce: (callback: Function, delay: number) => void

    /**Modules in start.js are built in host (outside of the vm). It is highly recommended to use this function
     * to require them in a VM context. If you opt to use require() instead, you may have issues.
     * @example
     * Example:
     * ```js
     * // Inside of start.js: modules: ["discord.js", "fs"]
     * 
     * // Now inside of a sample script:
     * 
     * // You can now use discord.js
     * let discord = getModule("discord.js")
     * 
     * // Login to a discord account, etc.
     * discord.login("myToken")
     * ```
     */
    getModule: (module: string) => NodeModule
}

const recursePattern = () => {
    return (Game.serverSettings.recursiveLoading && "/**/*.js") || "/*.js"
}

function vmLoadScriptInDirectory(vm: NodeVM, scriptDirectory: string, scriptType: string) {
    const files = glob.sync(scriptDirectory + recursePattern(), { dot: true })

    for (let filePath of files) {
        const fileName = basename(filePath)

        // We do not want to load core scripts if the user disabled them
        if (Game.disabledCoreScripts.includes(fileName)) {
            console.log(`[*] Disabled Core Script: ${fileName}`)
            continue
        }

        try {
            const scriptContents = fs.readFileSync(filePath, "UTF-8")
            vm.run(scriptContents, filePath)
            console.log(`[*] Loaded ${scriptType} Script: ${fileName}`)
        } catch (err) {
            console.log(`[*] Error loading ${scriptType} Script: ${fileName}`)
            console.error(err.stack)
        }
    }
}

function loadScripts() {
    const sandbox = {
        Game: Game,
    
        world: Game.world,

        Team: Team,

        Brick: Brick,

        Bot: Bot,

        Outfit: Outfit,

        util: { color, filter, serializer },

        Tool: Tool,

        PacketBuilder: PacketBuilder,

        sleep: promisify(setTimeout),

        // These need to be added to the VM to fix a bug with player.setInterval
        // If you don't add these, you cannot clear loops created by those functions.
        clearInterval: clearInterval,
        clearTimeout: clearTimeout,

        Vector3: Vector3,

        debounce: (func, wait) => {
            let timeout
            
            return function() {
                if (timeout) return

                timeout = setTimeout(() => {
                    timeout = null
                }, wait)

                func.apply(this, arguments)
            }
        },

        getModule: (name) => {
            if (!Game.modules[name]) 
                throw new Error(`No module with the name ${name} found.`)

            return Game.modules[name]
        }
    }

    const VM_SETTINGS: NodeVMOptions = {
        require: { 
            external: true,
            context: "sandbox"
        },
        sandbox: sandbox
    }

    const vm = new NodeVM(VM_SETTINGS)

    if (Game.disabledCoreScripts[0] !== "*")
        vmLoadScriptInDirectory(vm, CORE_DIRECTORY, "Core")
    else
        console.log("[*] All Core Scripts disabled")

    if (!Game.userScripts) return;

    vmLoadScriptInDirectory(vm, Game.userScripts, "User")
}

function initiateMap(map) {
    const mapName = basename(map)

    if (!mapName.endsWith(".brk")) {
        console.log("Map selected is not a .brk file. Aborting.")
        return process.exit(0)
    }

    console.clear()

    Game.mapName = mapName

    try {
        const mapData = loadBrk(map)
        Object.assign(Game.world, mapData)
    } catch (err) {
        console.error("Failure parsing brk: ", err && err.stack)
        return process.exit(1)
    }

    console.log(`Selected: <Port: ${Game.port} | Game: ${Game.gameId} | Map: ${Game.mapName}>`)
}

export interface GameSettings {
    /**The id of the Brick Hill set. */
    gameId: number,

    /**Whether or not the server will be posted to the games page. */
    postServer: boolean,

    /**The port the server will be running on. (Default is 42480).*/
    port?: number,

    /**A file path to the .brk file that will be hosted. (ex: `/maps/hello.brk`) */
    map?: string,

    /**An array containing the names of core scripts you do not want to run. \
     * For ex: `["admin.js"]`
     * 
     * You can use `["*"]` to disable ALL core scripts.
     * 
     * @default true
    */
    disabledCoreScripts?: Array<string>,

    /**
     * An array containing the names of npm modules / core node.js modules you want to compile from host, and use inside the VM context.
     * 
     * You can require them with {@link getModule}
     */
    modules?: Array<string>,
    
    /**A link to your scripts directory. ex: (`/myfolder/user_scripts`) */
    scripts?: string,

    /**A boolean indicating if the server is locally hosted or not. Uses port 42480 by default. \
     * Port forwarding is not required
     * @default false
    */
    local?: boolean,

    /**If enabled, all files (even inside of folders) in user_scripts will be loaded recursively */
    recursiveLoading?: boolean
}

/** Starts a node-hill server with the specified settings. */
export function startServer(settings: GameSettings) {
    if (!settings.port || isNaN(settings.port)) {
        console.log("No port specified. Defaulted to 42480.")
        settings.port = 42480
    }

    settings.postServer = (typeof settings.postServer === 'undefined' && true) || settings.postServer

    if (!settings.gameId || isNaN(settings.gameId)) {
        console.log("No game ID specified.")
        return process.exit(0)
    }

    if (settings.scripts) {
        settings.scripts = resolve(process.cwd(), settings.scripts)
        Game.userScripts = settings.scripts
    }

    Game.port = settings.port

    Game.gameId = settings.gameId

    Game.disabledCoreScripts = settings.disabledCoreScripts || []

    // Load the modules into Game.modules so the user can call them with getModule()
    settings.modules && settings.modules.forEach((module) => {
        if (typeof module === 'string') {
            Game.modules[module] = require(module)
        } else if (typeof module === 'object') {
            Object.assign(Game.modules, module)
        }
    })

    Game.modules['phin'] = require('phin')

    Game.recursiveLoading = settings.recursiveLoading || false

    Game.local = settings.local || false

    if (!settings.map) {
        console.warn("No map loaded. Using default baseplate.")
        Game.map = false
    } else {
        settings.map = resolve(process.cwd(), settings.map)
        Game.map = settings.map
        initiateMap(Game.map)
    }
    
    Game.serverSettings = settings

    // Do version check
    _getLatestnpmVersion().then((package_version) => {
        if (package_version !== Game.version) {
            console.warn(`Your node-hill version is out of date. [Latest version: ${package_version}]. \nRun \`npm update\` to resolve.`)
        }
    }).catch(() => {
        console.warn("Failure while checking for latest node-hill version.")
    })

    // Start the server
    require("./server")

    // Load user scripts
    loadScripts()
}

async function _getLatestnpmVersion() {
    const data = (await phin({url: NPM_LATEST_VERSION})).body
    return data.version
}

module.exports = { startServer }

