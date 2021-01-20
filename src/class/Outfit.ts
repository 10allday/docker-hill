import Player, { Assets, BodyColors } from "./Player"

import Bot from "./Bot"

/**
 * This is used for setting player & bot body colors + assets.
 * 
 * To replicate the changes, use the {@link Player.setOutfit} and {@link Bot.setOutfit} method(s).
 * 
 * @example
 * ```js
 * const outfit = new Outfit()
 *  // Sets body colors to white
 *  .body('#ffffff')
 *  // Change head color (body colors are still changed!)
 *  .head('#000000')
 *  
 * Game.on('playerJoin', (p) => {
 *  p.on('avatarLoaded', () => {
 *      // Apply the outfit to the player
 *      p.setOutfit(outfit)
 *  })
 * })
 */
export default class Outfit {
    _idString: Set<string>
    assets: Partial<Assets>
    colors: Partial<BodyColors>

    constructor() {
        this.assets = {}
        this.colors = {}
        this._idString = new Set()
    }

    /** Sets the player's hat1 to the asset id specified. */
    hat1(hatId: number) {
        this.assets.hat1 = hatId
        this._idString.add("U")
        return this
    }

    /** Sets the player's hat2 to the asset id specified. */
    hat2(hatId: number) {
        this.assets.hat2 = hatId
        this._idString.add("V")
        return this
    }

    /** Sets the player's hat3 to the asset id specified. */
    hat3(hatId: number) {
        this.assets.hat3 = hatId
        this._idString.add("W")
        return this
    }

    /** Sets the player's face to the asset id specified. */
    face(faceId: number) {
        this.assets.face = faceId
        this._idString.add("Q")
        return this
    }

    /** Sets all of the player's body colors to a hex string. */
    body(color: string) {
        this.colors.head = color
        this._idString.add("K")

        this.colors.torso = color
        this._idString.add("L")

        this.colors.rightArm = color
        this._idString.add("N")

        this.colors.leftArm = color
        this._idString.add("M")

        this.colors.leftLeg = color
        this._idString.add("O")

        this.colors.rightLeg = color
        this._idString.add("P")

        return this
    }

    /** Sets the player's head color to a hex string. */
    head(color: string) {
        this.colors.head = color
        this._idString.add("K")
        return this
    }

    /** Sets the player's torso color to a hex string. */
    torso(color: string) {
        this.colors.torso = color
        this._idString.add("L")
        return this
    }

    /** Sets the player's right arm color to a hex string. */
    rightArm(color: string) {
        this.colors.rightArm = color
        this._idString.add("N")
        return this
    }

    /** Sets the player's left arm color to a hex string. */
    leftArm(color: string) {
        this.colors.leftArm = color
        this._idString.add("M")
        return this
    }

    /** Sets the player's left leg color to a hex string. */
    leftLeg(color: string) {
        this.colors.leftLeg = color
        this._idString.add("O")
        return this
    }

    /** Sets the player's right leg color to a hex string. */
    rightLeg(color: string) {
        this.colors.rightLeg = color
        this._idString.add("P")
        return this
    }

    /** Copies a player or bot's entire outfit (assets + body colors). */
    copy(player: Player | Bot) {
        this.assets = Object.assign({}, player.assets)
        this.colors = Object.assign({}, player.colors)
        this._idString = new Set("UVWQKLNMOP")
        return this
    }

    get idString() {
        return Array.from(this._idString).join("")
    }
}