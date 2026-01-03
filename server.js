const express = require('express')
const cors = require('cors');
const app = express()
require('dotenv').config()
const PORT = process.env.PORT || 3000
const connectDb = require('./config/Database')
const authRoutes = require('./Routes/authRoutes')
const volunteerRoutes = require('./Routes/VolunteerRoutes')
const dcRoutes = require("./Routes/dcRoutes")


// Middleware
app.use(cors());
app.use(express.json())
connectDb()



app.use("/api",authRoutes)
app.use("/api",volunteerRoutes)
app.use("/api",dcRoutes)


app.listen(PORT,"0.0.0.0",()=>{
    console.log("Server is running...")
})