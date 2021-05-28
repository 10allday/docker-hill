import { Server, RedisPresence } from "colyseus";
import { MongooseDriver } from "colyseus/lib/matchmaker/drivers/MongooseDriver"

// binds each instance of the server on a different port.
const PORT = Number(process.env.PORT) + Number(process.env.NODE_APP_INSTANCE);

const gameServer = new Server({
    presence: new RedisPresence({
        url: "redis://127.0.0.1:6379/0"
    }),
    driver: new MongooseDriver(),
})

gameServer.listen(PORT);
console.log("Listening on", PORT);
