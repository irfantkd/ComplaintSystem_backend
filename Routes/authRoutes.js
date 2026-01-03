const express = require('express')
const Route = express.Router()
const authMiddleware = require('../middlewares/authMiddleware')


const { createUser , adminSignIn,fieldSignIn } = require('../Controllers/authControllers')

Route.post('/dc/createUser',authMiddleware,createUser)
Route.post('/admin/login',adminSignIn)
Route.post('    ',fieldSignIn)


module.exports = Route