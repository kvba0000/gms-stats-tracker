# 📈 gms-tracker
GameMakerServer Tracker is a simple web service which allows you to generate images with current amount of players in a game.
## 👀 How does it work?
Every 10 minutes this script saves player counts based of [GMS status page](https://status.gamemakerserver.com/). The script then saves them to the map with 15 recent values to be ready to be used.  
Besides of that, script also saves game title to show it on the image.
## 🔥 Do I need a lot of recources to run this?
Actually, no! The script caches as many things as possible to reduce amount of used data and memory.
- Background screenshots - All game screenshots are being cached every 3 hours to keep them somewhat up to date. If no screenshot is detected it will show dark background instead. `Custom background image soon!`
- Image generating - Images are being generated based on need, meaning if there was no change in data, the script won't request new image for generation, reducing usage and providing better performance.
## 🟡 Discord doesn't show the image!
Discord sometimes have problems with providing image for first request (for example with slow machines) due to timeout. Usually it should work the second time you request the image.
## 🛠️ Instalation
1. Clone the repo
```bash
$ git clone https://github.com/kvba0000/gms-stats-tracker
```
2. Install dependencies (I recommend using `pnpm` instead of `npm`)
```bash
$ pnpm install --frozen-lockfile
```
3. Run the service and enjoy!
```bash
$ pnpm start
```
Note: By default, server starts on port `8080` but if you want to change it use `PORT=<port>` env variable.  
Example:
```bash
PORT=1337 pnpm start
```
## 🎉 How to check if it's working?
By default root path (or any incorrect path) should lead to small home page of this service with credits and preview. Here you can copy the link of the automatically changing image.  
  
**WARNING.** On Discord (and any platform that caches images) you need to setup a bot that will automatically add a random number query (preferably current timestamp) so instead of `?id=1234` it will be `?id=1234&t=83274638276`, otherwise, the link will **ALWAYS** show the same result!