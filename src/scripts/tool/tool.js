const PacketBuilder = require("../../net/PacketBuilder").default

function create(tool) {
    const packet = new PacketBuilder("Tool")
        .write("bool", true)
        .write("uint32", tool._slotId)
        .write("string", tool.name)
        .write("uint32", tool.model)
    return packet
}

function destroy(tool) {
    const packet = new PacketBuilder("Tool")
        .write("bool", false)
        .write("uint32", tool._slotId)
        .write("string", tool.name)
        .write("uint32", tool.model)
    return packet
}

module.exports = {
    create,
    destroy
}