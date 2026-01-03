const express = require('express')
const app = express()
require('dotenv').config()
const PORT = process.env.PORT
const connectDb = require('./config/Database')


app.use(express.json())
connectDb()


const authRoutes = require('./Routes/authRoutes')
const volunteerRoutes = require('./Routes/VolunteerRoutes')

app.use(authRoutes)
app.use(volunteerRoutes)


app.listen(PORT,"0.0.0.0",()=>{
    console.log("Server is running...")
})