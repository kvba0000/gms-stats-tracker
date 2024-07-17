import axios from "axios"
import type { GameMakerStatusResponse, StatsSettings, Cache } from "./types/stats";
import { JSDOM } from "jsdom"
import { createCanvas, loadImage, registerFont } from "canvas";
import Jimp = require("jimp");
import { readFileSync } from "fs";
import { join } from "path";
import { formatNumber } from "./helper";

// Default stats user-agent
axios.defaults.headers["user-agent"] = "gms-player-tracker / originally by @kvba0000 / kvbaxi.contact@gmail.com"

// Fonts
registerFont(join(__dirname, "fonts", "RobotoCondensed-VariableFont_wght.ttf"), {family: "Roboto"})


const arrowIconData = {
    green: readFileSync(join(__dirname, "icons", "arrow-stat-g.svg")),
    red: readFileSync(join(__dirname, "icons", "arrow-stat-r.svg"))
}

const shadowImgData = readFileSync(join(__dirname, "shadow.png"))


export default class Stats {
    _settings: StatsSettings
    stats: Map<number, number[]> = new Map()
    games: Map<number, string> = new Map()
    screenshotCache: Map<number, Cache<Buffer>> = new Map()

    async getGameScreenshot(gameID: number) {
        if(this.screenshotCache.has(gameID)) {
            const cache = this.screenshotCache.get(gameID)
            if(cache.expire > Date.now()) return cache.data;
        }
        
        const { data: htmlData } = await axios.get(`https://gamemakerserver.com/en/games/${gameID}`)
        const dom = new JSDOM(htmlData)
    
        const screenshot = dom.window.document.querySelector<HTMLImageElement>('img[src^="/thumb-screenshots/"]')
        if(!screenshot) return null;
    
        const id = screenshot.src.match(/\/thumb-screenshots\/(\d+)?/)[1]
        const imageUrl = `https://gamemakerserver.com/screenshots/${id}/`
        const { data: imageArrBuf } = await axios.get(imageUrl, {responseType: "arraybuffer"})

        const imageData = Buffer.from(imageArrBuf, 'binary')
        this.screenshotCache.set(gameID, {
            expire: Date.now() + (60 * 60 * 1_000),
            data: imageData
        })
        return imageData
    }

    async updateStats() {
        const { data: status, status: code } = await axios.get<GameMakerStatusResponse>("https://gamemakerserver.com/dynamic/status.php", {validateStatus: () => true})
        if(code !== 200) return;

        const games = status.status
            .map(s => s.games) // Only games
            .flat() // Connect all nodes
            .filter(({ id }) => id !== 0) // Filter `(other)` games
        for(let { connected, id, title } of games) {
            if(!this.games.has(id)) this.games.set(id, title)
            if(!this.stats.has(id)) this.stats.set(id, [connected])
            else {
                const stats = this.stats.get(id)
                const newStats = [...stats, connected]
                this.stats.set(id, newStats.slice(-10))
            }
        }
    }

    async generateImage(gameID: number) {
        const gameTitle = this.games.get(gameID) || "(unknown)"
        const stats = this.stats.get(gameID)

        if(!stats) return null;

        const count = stats[stats.length-1] || 0
        const oldCount = stats[stats.length-2] || 0

        const canvas = createCanvas(1200, 800)
        const ctx = canvas.getContext("2d")
        
        ctx.fillStyle = "#333333"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
    
        const screenshotRaw = await this.getGameScreenshot(gameID)
        if(screenshotRaw) {
            const screenshot = await (await Jimp.read(screenshotRaw))
                .blur(5)
                .brightness(-0.5)
                .getBufferAsync(Jimp.MIME_PNG)
            
            const screenshotImage = await loadImage(screenshot)
            ctx.drawImage(
                screenshotImage,
                0, 0,
                canvas.width,
                canvas.height
            )
        }
    
        // Number count
        ctx.font = "260px Roboto"
        ctx.fillStyle = "#ffffff"
        const countText = formatNumber(count)
        const countTextSize = ctx.measureText(countText)
        const countTextPos = {
            x: (canvas.width / 2) - (countTextSize.actualBoundingBoxRight / 2),
            y: (canvas.height / 2) + (countTextSize.actualBoundingBoxAscent / 2)
        }
    
        // Shadow
        const shadowImg = await loadImage(shadowImgData)
        ctx.drawImage(
            shadowImg,
            countTextPos.x - (countTextSize.actualBoundingBoxRight * 0.2),
            countTextPos.y - (countTextSize.actualBoundingBoxAscent * 0.1),
            countTextSize.actualBoundingBoxRight * 1.5,
            countTextSize.actualBoundingBoxAscent / 2
        )
        
        // Writing text above shadow
        ctx.fillText(
            countText,
            countTextPos.x,
            countTextPos.y
        )
    
        const percentChange = oldCount !== 0 && count - oldCount !== 0 ? Math.round(((count - oldCount) / oldCount) * 100) : null;
        if(percentChange) {
            // Percents
            ctx.font = "60px Roboto"
            ctx.fillStyle = percentChange > 0 ? "#00ff00" : "#ff0000"
            const percText = percentChange + "%"
            const percTextSize = ctx.measureText(percText)
            const percTextPos = {
                x: countTextPos.x + countTextSize.actualBoundingBoxRight + 10,
                y: countTextPos.y + countTextSize.actualBoundingBoxDescent
            }
            ctx.fillText(
                percText,
                percTextPos.x,
                percTextPos.y
            )
    
            // Arrow
            const arrowIcon = await loadImage(arrowIconData[percentChange > 0 ? "green" : "red"])
            const arrowIconSize = percTextSize.actualBoundingBoxRight / 2
            
            ctx.drawImage(
                arrowIcon,
                percTextPos.x,
                percTextPos.y,
                arrowIconSize, arrowIconSize
            )
        }
    
        // Game title
        ctx.font = "50px Roboto"
        ctx.fillStyle = "#ffffff"
        const titleTextSize = ctx.measureText(gameTitle)
        const titleTextPos = {
            x: (canvas.width / 2) - (titleTextSize.actualBoundingBoxRight / 2),
            y: ((canvas.height / 2) + ((titleTextSize.actualBoundingBoxAscent) / 2)) / 2
        }
        ctx.fillText(
            gameTitle,
            titleTextPos.x,
            titleTextPos.y
        )
    
        return canvas.toBuffer("image/png")
    }

    constructor(settings: StatsSettings = {}) {
        this._settings = {
            updateInterval: 10,
            ...settings
        };

        this.updateStats();
        setInterval(this.updateStats, this._settings.updateInterval * 60 * 1000)
    }
}