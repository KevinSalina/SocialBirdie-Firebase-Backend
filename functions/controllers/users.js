require('dotenv').config()
const axios = require('axios')
const { db, admin } = require('../config/admin')
const { validateSignUp, validateLogin } = require('../utilities/validators')

const registerUser = async (req, res) => {
  try {
    const newUser = {
      ...req.body
    }

    // Validate Data
    const { valid, errors } = validateSignUp(newUser)
    console.log(valid)
    if (!valid) return res.status(400).json(errors)

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
}

const loginUser = async (req, res) => {
  const user = {
    ...req.body,
    returnSecureToken: true
  }

  // Validate Data
  const { valid, errors } = validateLogin(user)
  if (!valid) return res.status(404).json(errors)


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

}

module.exports = { registerUser, loginUser }