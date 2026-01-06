const mongoose = require('mongoose')

require("dotenv").config()
const connectDb = async()=>{
    try{
        await mongoose.connect(process.env.MONGO_URI)
        console.log('Database connected successfully');
    }
    catch(error){
        console.error('MongoDB connection error:', error.message);
    }
} 


module.exports = connectDb