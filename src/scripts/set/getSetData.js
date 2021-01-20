const phin = require("phin")
    .defaults({ parse: "json", timeout: 12000 })

const API = `https://www.brick-hill.com/api/profile/sets/`

async function getSetDataFromUser(userId) {
    const data = (await phin({url: API + userId})).body
    
    return data
}

module.exports = getSetDataFromUser