// App Config
require('dotenv').config()
const functions = require('firebase-functions')
const express = require('express')

const app = express()

// Require Controllers
const { getAllRounds, createRound, deleteRound, getRoundById, createComment, likeRound, unlikeRound } = require('./controllers/rounds')
const { registerUser, loginUser, uploadImage, addUserDetails, getAuthUserData } = require('./controllers/users')

// Require Middlewares
const { FBAuth } = require('./middlewares/fb-auth')

// Golf Round Routes
app.get('/rounds', getAllRounds)
app.post('/round', FBAuth, createRound)
app.get('/round/:roundId', getRoundById)
app.post('/round/:roundId/comment', FBAuth, createComment)
app.post('/round/:roundId/like', FBAuth, likeRound)
app.post('/round/:roundId/unlike', FBAuth, unlikeRound)
app.delete('/round/:roundId', FBAuth, deleteRound)

// User Routes
app.post('/signup', registerUser)
app.post('/login', loginUser)
app.post('/user/image', FBAuth, uploadImage)
app.post('/user', FBAuth, addUserDetails)
app.get('/user', FBAuth, getAuthUserData)

// Export all routes with /api
exports.api = functions.https.onRequest(app);