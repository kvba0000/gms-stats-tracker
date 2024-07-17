import Stats from "./stats";
import Express from "express"

const SERVER_PORT: number = parseInt(process.env["PORT"]) || 8080

const stats = new Stats()
const app = Express()

app.get("/stat", async (req, res) => {
    const id = parseInt(req.query.id as string)
    if(!id) return res.status(400).end();

    const img = await stats.generateImage(id)
    if(!img) return res.status(404).end();

    res.set('Cache-Control', 'public, max-age=180')
        .contentType("png")
        .status(200)
        .send(img)
        .end() 
})

app.use((req, res) => res.status(200).send(`Created by <a href="https://github.com/kvba0000">kvba0000 on GitHub</a>!`))

app.listen(SERVER_PORT, () => {
    console.log(`Server stated running at :${SERVER_PORT}!`)
})