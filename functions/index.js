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
const { Change } = require('firebase-functions')

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
// TODO: Finish markNotifications route
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
      if (!round.exists && round.date().username !== like.data().username) return
      // Create a new notification with sender and recipient info
      await db.collection('notifications').doc(`${like.id}`).set({
        createdAt: new Date().toISOString(),
        recipient: round.data().username,
        sender: like.data().username,
        type: 'like',
        read: 'false',
        roundId: round.id
      })
      return round
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
      return await db.collection('notifications').doc(`${like.id}`).delete()
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
      if (!round.exists && round.date().username !== comment.data().username) return
      // Create a new notification with sender and recipient info
      await db.collection('notifications').doc(`${comment.id}`).set({
        recipient: round.data().username,
        sender: comment.data().username,
        read: 'false',
        roundId: round.id,
        type: 'comment',
        createdAt: new Date().toISOString()
      })
      return round
    } catch (err) {
      console.error(err)
      return
    }
  })

exports.onUserImageChange = functions.firestore
  .document('/users/{id}')
  .onUpdate(async (change) => {
    console.log(change.before.data())
    console.log(change.after.data())
    if (change.before.data().imageUrl !== change.after.data().imageUrl) {
      console.log('Image has changed!!')
      const batch = db.batch()
      let rounds = await db.collection('rounds').where('username', '==', change.before.data().username).get()
      rounds.forEach(round => {
        batch.update(db.collection('rounds').doc(`${round.id}`), { userImage: change.after.data().imageUrl })
      })
      return batch.commit()
    }
  })

// if round is deleted, delete all associated likes, comments, and notifications
exports.onRoundDelete = functions.firestore
  .document('/rounds/{id}')
  .onDelete(async (snapshot, context) => {
    const roundId = context.params.roundId
    const batch = db.batch()
    const comments = await db.collection('comments').where('roundId', '==', roundId).get()
    comments.forEach(comment => {
      batch.delete(db.collection('comments').doc(`${comment.id}`))
    })
    const likes = await db.collection('likes').where('roundId', '==', roundId).get()
    likes.forEach(like => {
      batch.delete(db.collection('likes').doc(`${like.id}`))
    })
    const notifications = await db.collection('notifications').where('roundId', '==', roundId).get()
    notifications.forEach(notification => {
      batch.delete(db.collection('notifications').doc(`${notification.id}`))
    })
    return batch.commit()
  })
