const mongoose = require('mongoose')

const connectDb = async()=>{
    try{
        await mongoose.connect('mongodb://127.0.0.1:27017/COMPLAINTSYSTEM')
        console.log('Database connected successfully');
    }
    catch(error){
        console.error('MongoDB connection error:', error.message);
    }
} 


module.exports = connectDb