const phin = require("phin")
    .defaults({ parse: "json", timeout: 12000 })

const API = (assetId, cursor) => `https://api.brick-hill.com/v1/shop/${assetId}/owners?limit=100&cursor=${cursor}`

async function playerOwnsAsset(userId, assetId) {
    let cursor = '';
    while(cursor !== null) {
        const body = (await phin({url: API(assetId, cursor)})).body

        for (let copy of body.data) {
            if (copy.user.id === userId)
                return true
        }

        cursor = body.next_cursor
    }
    return false
}

module.exports = playerOwnsAsset