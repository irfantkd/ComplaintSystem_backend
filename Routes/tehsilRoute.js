const express = require('express')
const Route = express.Router()


const { createTehsil } = require('../Controllers/tehsilController')
const authMiddleware = require('../middlewares/authMiddleware')


Route.post('/create/tehsil',authMiddleware , createTehsil)


module.exports = Route