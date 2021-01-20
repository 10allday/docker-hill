/**
 * An enum that contains a list of all the keys allowed in player.keypress.
 * 
 * This is meant to verify packets to ensure that only valid key types are being sent.
 */
export enum KeyTypes {
    alphabetical = "a-z",
    numerical = "0 - 9",
    shift = "shift",
    space = "space",
    enter = "enter",
    backspace = "backspace"
}

const keys = "abcdefghijklmnopqrstuvwxyz0123456789".split("");

keys.push("enter")

keys.push("space")

keys.push("shift")

keys.push("control")

keys.push("backspace")

exports.whiteListedKey = keys