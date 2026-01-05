const express = require('express')
const Route = express.Router()
const authMiddleware = require('../middlewares/authMiddleware')


const {adminSignIn,fieldSignIn } = require('../Controllers/authControllers')


Route.post('/admin/login',adminSignIn)
Route.post('/fields/login',fieldSignIn)


module.exports = Route