const mongoose = require('mongoose')

const connectDb = async()=>{
    try{
        await mongoose.connect('mongodb+srv://abdullahkips75_db_user:loen77777@cluster0.5uosrjz.mongodb.net/COMPLAINTSYSTEM')
        console.log('Database connected successfully');
    }
    catch(error){
        console.error('MongoDB connection error:', error.message);
    }
} 


module.exports = connectDb