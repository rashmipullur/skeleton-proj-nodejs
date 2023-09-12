require('dotenv').config({ path: './src/config/.env' })
require('./config/mongodb')
const express = require('express')
const http = require('http')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const app = express()

app.use(express.json)
app.use(cors({credentials: true, origin: true}))
app.use(cookieParser())

// server port define
const PORT = process.env.PORT ||  5100
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`)
})