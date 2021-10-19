require('dotenv').config()
const functions = require("firebase-functions");
const admin = require('firebase-admin');
const express = require('express')
const serviceAccount = require('../ServiceAccountKey.json')
const axios = require('axios')
const app = express()

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})
const db = admin.firestore()

// Middleware - Is user authorized?
const FBAuth = async (req, res, next) => {
  let idToken;

  try {
    // Check if req has header of auth and it starts with firebase convention of 'Bearer'
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      idToken = req.headers.authorization.split('Bearer ')[1]
    } else {
      console.error('No token found')
      return res.status(403).json({ error: 'Unauthorized' })
    }

    // If we have token, and it is verified, add to request body so we can use in response
    const verifyToken = await admin.auth().verifyIdToken(idToken)
    console.group(verifyToken)
    req.body.user = verifyToken

    // Get assocaited user, and add to request body
    const user = await db.collection('users').where('userId', '==', verifyToken.uid).limit(1).get()
    req.body.username = user.docs[0].data().username

    return next()

  } catch (err) {
    console.error('Error while verifying token ', err)
    return res.status(403).json(err)
  }
}


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
app.post('/round', FBAuth, async (req, res) => {

  const { username, course, numHoles, par, score } = req.body

  try {
    const newRound = {
      username,
      course,
      numHoles,
      par,
      score,
      createdAt: new Date().toISOString()
    }

    const addedRound = await db.collection('rounds').add(newRound)

    return res.json({ message: `Round ${addedRound.id} created successfully!` })

  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Something went wrong' })
  }
})

// Helper Function for empty string
const isEmpty = string => string.trim() === ''
// Helper function for email check
const isValidEmail = (email) => {
  const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return emailRegEx.test(email)
}


// Sign Up Route
app.post('/signup', async (req, res) => {

  try {
    const newUser = {
      ...req.body
    }

    let errors = {}

    if (isEmpty(newUser.email)) {
      errors.email = 'Please enter email'
    } else if (!isValidEmail(newUser.email)) {
      errors.email = 'Invalid email'
    }

    if (isEmpty(newUser.password)) errors.password = 'Please enter password'
    if (newUser.password !== newUser.confirmPassword) errors.confirmPassword = 'Passwords do not match'

    if (isEmpty(newUser.username)) errors.username = 'Please enter username'

    if (Object.keys(errors).length > 0) return res.status(400).json(errors)

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
    await db.doc(`/users/${newUser.username}`).set(userCredentials)

    return res.status(201).json({ message: `user ${user.uid} sign up successfully` })

  } catch (err) {
    console.error(err)
    if (err.message === 'The email address is already in use by another account.') {
      return res.status(400).json({ email: err.message })
    }
    return res.status(500).json({ error: err.message })
  }
})

app.post('/login', async (req, res) => {
  const user = {
    ...req.body,
    returnSecureToken: true
  }

  // Validate
  let errors = {}

  if (isEmpty(user.email)) errors.email = 'Please enter email'
  if (isEmpty(user.password)) errors.password = 'Please enter password'

  if (Object.keys(errors).length > 0) return res.status(404).json(errors)

  try {
    const results = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API}`, user)
    res.json(results.data)
  } catch (err) {
    if (err.response) {
      console.log('1st', err.response.data)
      if (err.response.data.error.message === "EMAIL_NOT_FOUND") errors.email = 'Incorrect Credentials. Please try again'
      if (err.response.data.error.message === "INVALID_PASSWORD") errors.password = 'Incorrect Credentials. PLease try again'
      return res.status(400).json(errors)
    } else if (err.request) {
      console.log('2nd', err.request)
      res.json(err.request)
    } else {
      console.log('Error', err.message)
      res.status(500).json(err.message)
    }
  }

})


// Export all routes with /api
exports.api = functions.https.onRequest(app);