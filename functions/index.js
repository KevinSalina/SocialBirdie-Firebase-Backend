const functions = require("firebase-functions");
const admin = require('firebase-admin');
const express = require('express')
const serviceAccount = require('../ServiceAccountKey.json')
const app = express()

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})
const db = admin.firestore()

// Get All Golf Rounds
app.get('/rounds', async (req, res) => {
  try {
    const snapshot = await db.collection('rounds').orderBy('createdAt', 'desc').get()
    let allRounds = []
    snapshot.forEach(doc => {
      allRounds.push({
        roundId: doc.id,
        ...doc.data()
      })
    })

    return res.json(allRounds)

  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Cannot find golf rounds.' })
  }
})

// Create new Round
app.post('/round', async (req, res) => {
  try {
    const newRound = {
      ...req.body,
      createdAt: new Date().toISOString()
    }

    const addedRound = await db.collection('rounds').add(newRound)

    return res.json({ message: `Round ${addedRound.id} created successfully!` })

  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Something went wrong' })
  }
})

const isEmpty = string => string.trim() === ''

// Sign Up Route
app.post('/signup', async (req, res) => {

  try {
    const newUser = {
      ...req.body
    }

    if (isEmpty(newUser))

      // TODO validate data
      // Check if username is already taken
      const checkUsername = await db.doc(`/users/${newUser.username}`).get()
    if (checkUsername.exists) return res.status(400).json({ username: 'This username if already taken' })

    // Create new user
    const user = await admin.auth().createUser(newUser)


    // Create new user object to save in db
    const userCredentials = {
      username: newUser.username,
      email: newUser.email,
      createdAt: new Date().toISOString(),
      userId: user.uid

    }

    // Save new user in user collection
    const saveUser = await db.doc(`/users/${newUser.username}`).set(userCredentials)

    return res.status(201).json({ message: `user ${user.uid} sign up successfully` })

  } catch (err) {
    console.error(err)
    if (err.message === 'The email address is already in use by another account.') {
      return res.status(400).json({ email: err.message })
    }
    return res.status(500).json({ error: err.message })
  }
})


// Export all routes with /api
exports.api = functions.https.onRequest(app);