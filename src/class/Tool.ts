import { EventEmitter } from "events"

import Game, { Disconnectable } from "./Game"

import Player from "./Player"

const toolPacket = require("../scripts/tool/tool")

enum ToolEvents {
    Activated = "activated",
    Equipped = "equipped",
    Unequipped = "unequipped",
}

/** This is used for creating tools that can be used by in-game players.
 *  ![](https://cdn.discordapp.com/attachments/601268924251897856/655572131299590154/unknown.png)
 * */
export default class Tool extends EventEmitter {
    /** The name of the tool. **/
    readonly name: string
    /** If set to false, players will not be able to equip or de-equip the tool. */
    enabled : boolean = true
    /** The assetId of the tool's model. */
    model: number = 0
    /** The slotId of the tool. [Used internally].*/
    private _slotId: number
    
    static toolId: number = 0

    /** 
    * Fires when a player holding the tool clicks the left mouse button. \
    * This will not be emitted if you disable the toolHandler.js core script.
    * @event
    * @example
    * ```js
    * let tool = new Tool("Balloon")
    * tool.model = 84038
    * Game.on("playerJoin", (player) => {
    *    player.on("initialSpawn", () => {
    *        player.equipTool(tool)
    *    })
    * })
    * tool.on("activated", (p) => {
    *   console.log(p.username + " has clicked with the tool equipped!")
    * })
    * ```
    */
    static readonly activated = ToolEvents.Activated

    /** Fires when a player equips a tool. 
     * @event */
    static readonly equipped = ToolEvents.Equipped


    /** Fires when a player unequips a tool. 
     * @event */
   static readonly unequipped = ToolEvents.Unequipped

    addListener(event: ToolEvents.Activated, listener: (chunk: Buffer | string) => void): this;

    addListener(event: ToolEvents.Equipped, listener: (chunk: Buffer | string) => void): this;

    addListener(event: ToolEvents.Unequipped, listener: (chunk: Buffer | string) => void): this;

    addListener(event: ToolEvents , listener: any): this { return super.addListener(event, listener); }

    constructor(name: string) {
        super()
        Tool.toolId += 1 
        this.name = name
        this.model = 0
        this.enabled = true
        this._slotId = Tool.toolId
    }

    /** Calls the specified callback with the player who un-equipped the tool.
    * @example
    * ```js
    * let tool = new Tool("Balloon")
    * tool.model = 84038
    * tool.unequipped((p) => {
    *   p.setJumpPower(5) // Reset their jump power back to normal.
    * })
    * ```
    */
    unequipped(callback: (player: Player) => void): Disconnectable {
        const toolEvent = (p) => {
            callback(p)
        }
        this.on("unequipped", toolEvent)
        return {
            disconnect: () => this.off("unequipped", toolEvent)
        }
    }

    /** 
    * Calls the specified callback with the player who equipped the tool.
    * @example
    * ```js
    * let tool = new Tool("Balloon")
    * tool.model = 84038
    * tool.equipped((p) => {
    *   p.setJumpPower(20) // Give the player a height boost
    * })
    * ```
    */
    equipped(callback: (player: Player) => void): Disconnectable {
        const toolEvent = (p) => {
            callback(p)
        }
        this.on("equipped", toolEvent)
        return {
            disconnect: () => this.off("equipped", toolEvent)
        }
    }

    /** Completely destroys the tool, unequips it from all players, deletes it from their inventroy, and removes it from Game.world.tools. */
    async destroy() {
        for (let player of Game.players) {
            // Fire tool unequipped to player
            if (player.toolEquipped === this) {
                player.toolEquipped = null
                this.emit("unequipped", player)
            }
            // Remove the tool from the player's inventory
            await player.destroyTool(this)
        }

        const index = Game.world.tools.indexOf(this)
        if (index === -1) return 
        
        Game.world.tools.splice(index, 1)

        this.removeAllListeners()

        return toolPacket.destroy(this)
            .broadcast()
    }
}