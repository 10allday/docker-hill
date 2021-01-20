import { deflateSync } from "zlib"

import { SmartBuffer } from "smart-buffer"

import * as uintv from "./uintv"

import Game from "../class/Game"

import Player from "../class/Player"

export interface PacketBuilderOptions {
    compression?: boolean
}

export enum PacketEnums {
    Authentication = 1,

    SendBrick = 2,

    SendPlayers = 3,

    Figure = 4,

    RemovePlayer = 5,

    Chat = 6,

    PlayerModification = 7,

    Kill = 8,

    Brick = 9,

    Team = 10,

    Tool = 11,

    Bot = 12,

    ClearMap = 14,

    DestroyBot = 15,

    DeleteBrick = 16
}

export default class PacketBuilder {
    packetId: number
    compression: boolean
    buffer: SmartBuffer
    options: PacketBuilderOptions

    constructor(packetType: keyof typeof PacketEnums | PacketEnums, options?: PacketBuilderOptions) {
        if (typeof packetType === "string")
            this.packetId = PacketEnums[packetType]
        else
            this.packetId = packetType

        this.buffer = new SmartBuffer()

        this.options = options || {
            compression: false
        }

        this.write("uint8", this.packetId)
    }

    write(type: string, data: any) {
        switch (type) {
            case "string": {
                this.buffer.writeStringNT(data)
                break
            }
            case "bool": {
                data = data ? 1 : 0
                this.buffer.writeUInt8(data)
                break
            }
            case "float": {
                this.buffer.writeFloatLE(data)
                break   
            }
            case "uint8": {
                this.buffer.writeUInt8(data)
                break
            }
            case "int32": {
                this.buffer.writeInt32LE(data)
                break
            }
            case "uint32": {
                this.buffer.writeUInt32LE(data)
                break
            }
        }
        return this
    }

    // Convert SmartBuffer to a buffer, compress it, and add uintv size to header.
    private transformPacket() {
        let packet = this.buffer.toBuffer()

        if (this.options.compression)
            packet = deflateSync(packet)

        return uintv.writeUIntV(packet)
    }

    /** 
     * Send a packet to every connected client except for players specified.
    */
    async broadcastExcept(players: Array<Player>) {
        const packet = this.transformPacket()

        let promises = []

        for (let player of Game.players) {
            if (!players.includes(player)) {
                promises.push(new Promise((resolve) => {
                    if (!player.socket.destroyed)
                        player.socket.write(packet, null, resolve)
                }))
            }
        }

        return Promise.all(promises)
    }

    /**
     * Send a packet to every connected client.
     */
    async broadcast() {
        const packet = this.transformPacket()

        let promises = []
        
        for (const player of Game.players) {
            if (!player.socket.destroyed) {
                promises.push(new Promise((resolve) => {
                    player.socket.write(packet, null, resolve)
                }))
            }
        }

        return Promise.all(promises)
    }

    /**
     * Send a packet to a single client.
    */
   async send(socket: Player["socket"]): Promise<boolean> {
        const packet = this.transformPacket()

        if (socket.destroyed) return

        return socket.write(packet, null, () => {
            return Promise.resolve(true)
        })
    }
}