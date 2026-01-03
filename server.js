const express = require('express')
const cors = require('cors');
const app = express()
require('dotenv').config()
const PORT = process.env.PORT || 3000

const cors = require('cors')
const connectDb = require('./config/Database')
const authRoutes = require('./Routes/authRoutes')
const volunteerRoutes = require('./Routes/VolunteerRoutes')
const dcRoutes = require("./Routes/dcRoutes")


// Middleware
app.use(cors());
app.use(express.json())
app.use(cors())
connectDb()




app.use("/api",dcRoutes)
const authRoutes = require('./Routes/authRoutes')
const volunteerRoutes = require('./Routes/VolunteerRoutes')
const tehsilRoutes = require('./Routes/tehsilRoute')

app.use("/api",authRoutes)
app.use("/api",volunteerRoutes)
app.use("/api",tehsilRoutes)


app.listen(PORT,"0.0.0.0",()=>{
    console.log("Server is running...")
})