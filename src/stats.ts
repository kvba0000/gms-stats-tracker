import axios from "axios"
import type { GameMakerStatusResponse, StatsSettings } from "./types/stats";
import { JSDOM } from "jsdom"
import { createCanvas, loadImage, registerFont } from "canvas";
import Jimp = require("jimp");
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { join } from "path";
import { formatNumber, randomItem } from "./helper";

// Default axios info
axios.defaults.headers["user-agent"] = "gms-player-tracker / originally by @kvba0000 / github.com/kvba0000/gms-stats-tracker"
axios.defaults.validateStatus = () => true

// Fonts
registerFont(join(__dirname, "fonts", "RobotoCondensed.ttf"), {family: "Roboto"})


const arrowIconData = {
    green: readFileSync(join(__dirname, "icons", "arrow-stat-g.svg")),
    red: readFileSync(join(__dirname, "icons", "arrow-stat-r.svg"))
}

const shadowImgData = readFileSync(join(__dirname, "shadow.png"))


const SCREENSHOT_CACHE_PATH = join(".", "cache", "screenshots")
const STATS_CACHE_PATH = join(".", "cache", "stats")

export default class Stats {
    /** Settings */
    _settings: StatsSettings
    /** If there's new data and should ignore cache */
    shouldUseCache: Map<number, boolean> = new Map()
    /** Last 10 playercounts of games */
    stats: Map<number, number[]> = new Map()
    /** Names of games */
    games: Map<number, string> = new Map()

    async getGameScreenshot(gameID: number) {
        if(!existsSync(SCREENSHOT_CACHE_PATH)) mkdirSync(SCREENSHOT_CACHE_PATH, { recursive: true })
        const cachePath = join(SCREENSHOT_CACHE_PATH, String(gameID))
        if(existsSync(cachePath)) {
            const cacheInfo = statSync(cachePath)
            if(Date.now() < cacheInfo.mtimeMs + (3 * 60 * 60 * 1_000)) { // <- 3 hours
                const files = readdirSync(cachePath);
                return readFileSync(join(cachePath, randomItem(files)));
            }
        }
        
        const { data: htmlData, status } = await axios.get(`https://gamemakerserver.com/en/games/${gameID}`)
        if(status !== 200) return null;

        const dom = new JSDOM(htmlData)
    
        const screenshots = dom.window.document.querySelectorAll<HTMLImageElement>('img[src^="/thumb-screenshots/"]')
        if(screenshots.length === 0) return null;

        if(!existsSync(cachePath)) mkdirSync(cachePath, { recursive: true })

        let i: number = 0;
        let imageData: Buffer;
        for (let screenshot of Array.from(screenshots)) {
            const id = screenshot.src.match(/\/thumb-screenshots\/(\d+)?/)[1]
            const { data: imageArrBuf } = await axios.get(`https://gamemakerserver.com/screenshots/${id}/`, {responseType: "arraybuffer"})
            imageData = Buffer.from(imageArrBuf, 'binary')
            writeFileSync(join(cachePath, `${i}.jpg`), imageData)
            i++;
        }

        return imageData
    }

    async updateStats() {
        const { data: status, status: code } = await axios.get<GameMakerStatusResponse>("https://gamemakerserver.com/dynamic/status.php")
        if(code !== 200) return null;

        const games = status.status
            .map(s => s.games) // Only games
            .flat() // Connect all nodes
            .filter(({ id }) => id !== 0) // Filter `(other)` games
        for(let { connected, id, title } of games) {
            if(!this.games.has(id)) this.games.set(id, title)
            if(!this.stats.has(id)) this.stats.set(id, [connected])
            else {
                const stats = this.stats.get(id)
                if(stats[stats.length-1] !== connected) this.shouldUseCache.set(id, false)
                const newStats = [...stats, connected]
                this.stats.set(id, newStats.slice(-10))
            }
        }
    }

    async generateImage(gameID: number) {
        const gameTitle = this.games.get(gameID) || "(unknown)"
        const stats = this.stats.get(gameID)

        if(!stats) return null;

        if(!existsSync(STATS_CACHE_PATH)) mkdirSync(STATS_CACHE_PATH, { recursive: true })
        const cachePath = join(STATS_CACHE_PATH, `${gameID}.jpg`)
        const shouldUseCache = (this.shouldUseCache.get(gameID) || false) && existsSync(cachePath)
        if(shouldUseCache) {
            const cacheFile = readFileSync(cachePath)
            return cacheFile
        }

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
                .getBufferAsync("image/jpeg")
            
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

        // Previous Values
        ctx.font = "30px Roboto"
        ctx.fillStyle = "#cccccc"
        const previousValues = `Previous values:\n( ${stats.slice(-6, -1).join(", ")} )`
        const previousValuesSize = ctx.measureText(previousValues)
        const previousValuesPos = {
            x: (canvas.width / 2) - (previousValuesSize.actualBoundingBoxRight / 2),
            y: canvas.height - (previousValuesSize.actualBoundingBoxDescent + 10)
        }
        ctx.fillText(
            previousValues,
            previousValuesPos.x,
            previousValuesPos.y
        )
    
        const imgBuf = canvas.toBuffer("image/jpeg")
        writeFileSync(cachePath, imgBuf)
        this.shouldUseCache.set(gameID, true)
        return imgBuf
    }

    constructor(settings: StatsSettings = {}) {
        this._settings = {
            updateInterval: 10,
            ...settings
        };

        this.updateStats();
        setInterval(this.updateStats.bind(this), this._settings.updateInterval * 60 * 1000)
    }
}