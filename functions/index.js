// App Config
require('dotenv').config()
const functions = require('firebase-functions')
const express = require('express')

const app = express()

// Require Routes
const { getAllRounds, createRound } = require('./controllers/rounds')
const { registerUser, loginUser, uploadImage, addUserDetails, getAuthUserData } = require('./controllers/users')

// Require Middlewares
const { FBAuth } = require('./middlewares/fb-auth')

// Golf Round Routes
app.get('/rounds', getAllRounds)
app.post('/round', FBAuth, createRound)

// User Routes
app.post('/signup', registerUser)
app.post('/login', loginUser)
app.post('/user/image', FBAuth, uploadImage)
app.post('/user', FBAuth, addUserDetails)
app.get('/user', FBAuth, getAuthUserData)

// Export all routes with /api
exports.api = functions.https.onRequest(app);