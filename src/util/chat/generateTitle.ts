import formatHex from "../color/formatHex"
import Player from "../../class/Player"

export default function generateTitle(p: Player, message: string) {
    let title = `[#ffde0a]${p.username}\\c1:\\c0 ` + message

    if (p.team)
        title = `[${p.team.color}]${p.username}\\c1:\\c0 ` + message
        
    if (p.admin)
        title = `[#ffde0a]${p.username}\\c1:\\c0 ` + '[#ffde0a]' + message

    if (p.chatColor)
        title = `[${p.chatColor}]${p.username}\\c1:\\c0 ` + message

    title = formatHex(title)

    return title
}