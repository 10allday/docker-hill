/*

Converts [#hex]My message (so the client can interpret it for topPrints, chats, etc)

Returns the *modified* input, or just input.

*/

import colorModule from "./colorModule"

const COLOR_REGEX = /(\[#[0-9a-fA-F]{6}\])/g

/**@hidden */
export default function formatHex(input: string): string {
    const match = input.match(COLOR_REGEX)
    if (!match) return input

    match.forEach((colorCode) => {
        let hexCol = colorCode.replace(/[\[#\]]/g, "").toUpperCase()
        hexCol = colorModule.rgbToBgr(hexCol)
        input = input.replace(colorCode, `<color:${hexCol}>`)
    })
    
    return input
}