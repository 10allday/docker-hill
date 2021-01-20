const phin = require("phin")
    .defaults({"parse": "json", "timeout": 12000})

const GET_ASSETS =  "https://api.brick-hill.com/v1/games/retrieveAvatar?id="

function getNonEmptyHats(assets) {
    let hats = []

    for (i = 0; i < 5; i++) {
        if (hats.length >= 3) break

        let hat = assets.hats[i]

        if (hat)
            hats.push(hat)
    }

    return hats
}

async function setAvatar(p, userId) {
    const data = (await phin({url: GET_ASSETS + userId})).body
    
    p.colors.head           = "#" + data.colors.head.toLowerCase()
    p.colors.torso          = "#" + data.colors.torso.toLowerCase()
    p.colors.leftArm        = "#" + data.colors.left_arm.toLowerCase()
    p.colors.rightArm       = "#" + data.colors.right_arm.toLowerCase()
    p.colors.leftLeg        = "#" + data.colors.left_leg.toLowerCase()
    p.colors.rightLeg       = "#" + data.colors.right_leg.toLowerCase()

    p.assets.tool           = data.items.tool
    p.assets.face           = data.items.face
    p.assets.tshirt         = data.items.tshirt
    p.assets.shirt          = data.items.shirt
    p.assets.pants          = data.items.pants

    let hats = getNonEmptyHats(data.items)

    p.assets.hat1 = hats[0] || 0
    p.assets.hat2 = hats[1] || 0
    p.assets.hat3 = hats[2] || 0

    return Promise.resolve(true)
}

module.exports = setAvatar