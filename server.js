const express = require('express')
const app = express()
require('dotenv').config()
const PORT = process.env.PORT
const connectDb = require('./config/Database')


app.use(express.json())
connectDb()


const authRoutes = require('./Routes/authRoutes')

app.use(authRoutes)


app.listen(PORT,()=>{
    console.log("Server is running...")
})