const functions = require("firebase-functions");
const admin = require('firebase-admin');
// const firebase = require('firebase')
const express = require('express')
const serviceAccount = require('../ServiceAccountKey.json');
const axios = require("axios");
const { SSL_OP_EPHEMERAL_RSA } = require("constants");
const app = express()

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})
const db = admin.firestore()

// Initialize Firebase SDK
const firebaseConfig = {
  apiKey: "AIzaSyDJ28vguJLmVdHGGtrwI3xbHfoa73XeE1E",
  authDomain: "socialbirdie-d941f.firebaseapp.com",
  projectId: "socialbirdie-d941f",
  storageBucket: "socialbirdie-d941f.appspot.com",
  messagingSenderId: "360351689489",
  appId: "1:360351689489:web:33293c43b4175f5038bab0",
  measurementId: "G-Q41R3HHDNG"
};
// firebase.initializeApp(firebaseConfig)

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

// Helpr Function to see if string is empty
const isEmpty = string => string.trim() === ''
// Helper Function to see if email is valid
const isEmail = (email) => {
  const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

  return emailRegEx.test(email)
}

// Sign Up Route
app.post('/signup', async (req, res) => {

  // Initialize Errors Object
  let errors = {};

  try {
    const newUser = {
      ...req.body
    }

    // Check for each value to be valid
    if (isEmpty(newUser.email)) {
      errors.email = 'Please enter email'
    } else if (!isEmail(newUser.email)) {
      errors.email = 'Please enter valid email';
    }

    if (isEmpty(newUser.password)) errors.password = 'Please enter password'
    if (newUser.password !== newUser.confirmPassword) errors.password = 'Passwords do not match'

    if (isEmpty(newUser.username)) errors.username = 'Please enter username'

    if (Object.keys(errors).length > 0) return res.status(404).json(errors)

    // Todo: Validate

    // Check if username is already taken
    const checkUsername = await db.doc(`/users/${newUser.username}`).get()
    if (checkUsername.exists) return res.status(400).json({ username: 'This username is already taken' })

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
    const results = await axios.post('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyDJ28vguJLmVdHGGtrwI3xbHfoa73XeE1E', user)
    res.json(results.data)
  } catch (err) {
    if (err.response) {
      console.log('1st', err.response.data)
      if (err.response.data.error.message === "EMAIL_NOT_FOUND") errors.email = 'Incorrect Email. Please try again'
      if (err.response.data.error.message === "INVALID_PASSWORD") errors.password = 'Incorrect Password. PLease try again'
      return res.status(400).json(errors)
    } else if (err.request) {
      console.log('2nd', err.request)
      res.send(err.request)
    } else {
      console.log('Error', err.message)
      res.status(500).json(err.message)
    }
  }

})


// Export all routes with /api
exports.api = functions.https.onRequest(app);