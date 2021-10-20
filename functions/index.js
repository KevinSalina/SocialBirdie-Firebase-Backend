// App Config
require('dotenv').config()
const functions = require('firebase-functions')
const express = require('express')
const { db } = require('./config/admin')

const app = express()

// Require Controllers
const { getAllRounds, createRound, deleteRound, getRoundById, createComment, likeRound, unlikeRound } = require('./controllers/rounds')
const { registerUser, loginUser, uploadImage, addUserDetails, getAuthUserData, getUserByUsername, markNotificationsRead } = require('./controllers/users')

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
app.get('/user/:username', getUserByUsername)
app.post('/notifications', FBAuth, markNotificationsRead)

// Export all routes with /api
exports.api = functions.https.onRequest(app);

// Notifications - using cloud firestore triggers
// Create notification on new like
// Look for when a like is created
exports.createNotificationOnLike = functions.firestore
  .document('likes/{id}')
  .onCreate(async (like) => {
    try {
      // Get the associated round data
      const round = await db.collection('rounds').doc(`${like.data().roundId}`).get()
      // If round does dot exist return nothing
      if (!round.exists) return
      // Create a new notification with sender and recipient info
      await db.collection('notifications').doc(`${like.id}`).set({
        createdAt: new Date().toISOString(),
        recipient: round.data().username,
        sender: like.data().username,
        type: 'like',
        read: 'false',
        roundId: round.id
      })
      return
    } catch (err) {
      console.error(err)
      return
    }
  })

// Delete Notification if needed
exports.deleteNotificationOnUnlike = functions.firestore
  .document('likes/{id}')
  .onDelete(async (like) => {
    try {
      // Notification and like id are the same
      await db.collection('notifications').doc(`${like.id}`).delete()
      return
    } catch (err) {
      console.error(err)
      return
    }
  })

// Create notification on new comment
// Look for when comment is created
exports.createNotificationOnComment = functions.firestore
  .document('comments/{id}')
  .onCreate(async (comment) => {
    try {
      // Get associated round data
      const round = await db.collection('rounds').doc(`${comment.data().roundId}`).get()
      // If round does dot exist return nothing
      if (!round.exists) return
      // Create a new notification with sender and recipient info
      await db.collection('notifications').doc(`${comment.id}`).set({
        recipient: round.data().username,
        sender: comment.data().username,
        read: 'false',
        roundId: round.id,
        type: 'comment',
        createdAt: new Date().toISOString()
      })
      return
    } catch (err) {
      console.error(err)
      return
    }
  })
