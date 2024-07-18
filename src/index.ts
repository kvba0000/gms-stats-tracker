import { join } from "path";
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
        .contentType("image/jpeg")
        .status(200)
        .send(img)
        .end() 
})

app.use("/fonts", Express.static(join(__dirname, "fonts")))
app.use("/", Express.static(join(__dirname, "public")))

app.use((req, res) => res.redirect("/"))

app.listen(SERVER_PORT, () => {
    console.log(`Server stated running at :${SERVER_PORT}!`)
})