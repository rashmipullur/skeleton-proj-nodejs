require('dotenv').config({ path: './src/config/.env' })
require('./config/mongodb')
const express = require('express')
const http = require('http')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const app = express()

//importing the routes
const userRouter = require('./routes/user.route')



app.use(express.json())
app.use(cors({credentials: true, origin: true}))
app.use(cookieParser())

//accessing the routes
app.use(userRouter)

//default route
app.all('*', (req, res) => {
    return res.status(404).send("URL not found server.js")
})

// server port define
const PORT = process.env.PORT ||  5100  
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`)
})