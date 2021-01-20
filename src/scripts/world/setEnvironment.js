const Game = require("../../class/Game").default

const PacketBuilder = require("../../net/PacketBuilder").default

const { hexToDec } = require("../../util/color/colorModule").default

// Used for converting camelCase to Brick Hill's weird way of doing it.
const BRICK_HILL_ENVIRONMENTS = {
    "ambient": "Ambient",
    "skyColor": "Sky",
    "baseColor": "BaseCol",
    "baseSize": "BaseSize",
    "sunIntensity": "Sun"
}

// Brick Hill weather names
const BRICK_HILL_WEATHER = {
    "snow": "WeatherSnow",
    "rain": "WeatherRain",
    "sun": "WeatherSun"
}

async function setEnvironment(environment = {}, socket) {
    const env_keys = Object.keys(environment)

    for (let key of env_keys) {
        if (typeof Game.world.environment[key] === "undefined") {
            return Promise.reject("Invalid environment property: " + key)
        }
    }

    let promises = []

    for (let prop of env_keys) {
        const packet = new PacketBuilder("PlayerModification")

        let change = environment[prop]

        if (!socket) Game.world.environment[prop] = change

        if (prop === "weather") {
            const weather = BRICK_HILL_WEATHER[change]
            
            if (!weather) return Promise.reject("Invalid weather type (options: sun, rain, snow)")

            packet.write("string", weather)
        } else {
            switch(prop) {
                case "ambient": {
                    change = hexToDec(change, true)
                    break
                }
                case "baseColor": {
                    change = hexToDec(change, true)
                    break
                }
                case "skyColor": {
                    change = hexToDec(change)
                    break
                }
            }
            packet.write("string", BRICK_HILL_ENVIRONMENTS[prop])
            packet.write("uint32", change)
        }

        if (socket) { // A socket was specified, this is a local change.
            promises.push(packet.send(socket))
        } else {
            promises.push(packet.broadcast())
        }
    }

    return Promise.all(promises)
}

module.exports = setEnvironment