const phin = require("phin")
    .defaults({ parse: "json", timeout: 12000 })

const API = (groupId, user) => `https://api.brick-hill.com/v1/clan/member?id=${groupId}&user=${user}`

async function getRankInGroup(groupId, userId) {
    let groupData = false
    const data = (await phin({url: API(groupId, userId)})).body
    if (data.status && data.status === "accepted") {
        groupData = data
    }
    return groupData
}

module.exports = getRankInGroup