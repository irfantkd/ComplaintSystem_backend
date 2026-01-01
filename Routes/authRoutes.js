const express = require('express')
const Route = express.Router()
const authMiddleware = require('../middlewares/authMiddleware')


const { createUser , signIn } = require('../Controllers/authControllers')

Route.post('/createUser',authMiddleware,createUser)
Route.post('/signIn',signIn)


module.exports = Route