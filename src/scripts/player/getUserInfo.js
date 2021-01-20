const phin = require("phin")
    .defaults({
        parse: "json",
        timeout: 12000 
    })

const API = "https://api.brick-hill.com/v1/user/profile?id="

async function getUserInfo(userId) {
    return (await phin({url: API + userId})).body
}

module.exports = getUserInfo