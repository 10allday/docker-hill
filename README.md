![](https://cdn.discordapp.com/attachments/601268924251897856/625840747828084757/node-hill_SMALL.png)

### What is this?
A Brick Hill legacy server written from the ground up in Node.js.

### What does this do?
It allows you to host Brick Hill servers efficiently, and headlessly (VPS hosting, etc). It comes
with a fully-packed scripting API that lets you do things the legacy server normally couldn't do.

It can load .brk files to the client extremely fast, but at the same time being memory and CPU
efficient. Allowing for long-term 24/7 hour hosting.

### What does this NOT do?
This does not provide any additional functionality to the legacy client.

ie. The client will not gain any FPS improvements.

### Installation:

1. You need Node.js (8+) (Download it here: [https://nodejs.org/en/download/](https://nodejs.org/en/download/)).

2. Download and extract the template [here](https://cdn.discordapp.com/attachments/705586171052294184/743879528065269870/Node-hill-8.4.0-Template.zip).

3. Open your folder in the file explorer, and in the top bar type "cmd" and press enter.
Example: ![](https://cdn.discordapp.com/attachments/601268924251897856/648273282315059247/unknown.png)

4. Run `npm i node-hill@latest`, this will install the needed dependencies for node-hill.
![](https://cdn.discordapp.com/attachments/601268924251897856/648273827704602635/unknown.png)

5. [OPTIONAL] Run `npm explore node-hill -- npm run sync-account` if you are hosting on a VPS. This lets you login to your
account from your VPS. This will sync your VPS IP to your Brick Hill account.

6. Edit `./start.js` to replace gameId with your proper gameId, port, etc.

7. Finally, start your server by clicking on `launch_server.bat` or running `node ./start.js`.
![](https://cdn.discordapp.com/attachments/601268924251897856/648274112740982794/unknown.png)


## Additional information
You __must__ port forward if you want other players to be able to play your game. The recommended port for Brick Hill is: 42480.

## Documentation
Can be found here: [https://brickhill.gitlab.io/open-source/node-hill/](https://brickhill.gitlab.io/open-source/node-hill/index.html).