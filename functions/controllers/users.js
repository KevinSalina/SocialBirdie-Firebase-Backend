require('dotenv').config()
const axios = require('axios')
const functions = require('firebase-functions')
const { db, admin, bucket } = require('../config/admin')
const { validateSignUp, validateLogin, reduceUserDetails } = require('../utilities/validators')

// Sign Up User
const registerUser = async (req, res) => {
  try {
    const newUser = {
      ...req.body
    }

    // Validate Data
    const { valid, errors } = validateSignUp(newUser)
    console.log(valid)
    if (!valid) return res.status(400).json(errors)

    const stockUserImage = 'stockUserImage.png'

    // Check if username is already taken
    const checkUsername = await db.collection('users').doc(`${newUser.username}`).get()
    if (checkUsername.exists) return res.status(400).json({ username: 'This username if already taken' })

    // Create new user Authentication in firebase app
    const user = await admin.auth().createUser(newUser)

    // Create new user object to save in db
    const userCredentials = {
      username: newUser.username,
      email: newUser.email,
      createdAt: new Date().toISOString(),
      imageUrl: `https://firebasestorage.googleapis.com/v0/b/${functions.config().my_keys.bucket_key ? functions.config().my_keys.bucket_key : process.env.FIREBASE_BUCKET}/o/${stockUserImage}?alt=media`,
      // imageUrl: `https://firebasestorage.googleapis.com/v0/b/${process.env.FIREBASE_BUCKET}/o/${stockUserImage}?alt=media`,
      userId: user.uid

    }

    // Save new user in user collection
    await db.collection('users').doc(`${newUser.username}`).set(userCredentials)

    return res.status(201).json({ message: `user ${user.uid} sign up successfully` })

  } catch (err) {
    console.error(err)
    if (err.message === 'The email address is already in use by another account.') {
      return res.status(400).json({ email: err.message })
    }
    return res.status(500).json({ error: err.message })
  }
}


// Login User
const loginUser = async (req, res) => {
  const user = {
    ...req.body,
    returnSecureToken: true
  }

  // Validate Data
  const { valid, errors } = validateLogin(user)
  if (!valid) return res.status(404).json(errors)


  try {
    const results = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${functions.config().my_keys.api_key ? functions.config().my_keys.api_key : process.env.FIREBASE_API}`, user)
    // const results = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API}`, user)
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

// Lets user add bio and location
const addUserDetails = async (req, res) => {
  let userDetails = reduceUserDetails(req.body)

  try {
    await db.collection('users').doc(`${req.body.username}`).update(userDetails)

    return res.status(200).json({ message: 'Details added successfully' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.code })
  }
}

// Get user details by username
const getUserByUsername = async (req, res) => {
  const { username } = req.params

  let userData = {}

  try {
    const user = await db.collection('users').doc(`${username}`).get()
    if (!user.exists) return res.status(404).json({ error: 'User not found' })
    userData.user = user.data()

    const rounds = await db.collection('rounds').where('username', '==', username).orderBy('createdAt', 'desc').get()
    userData.rounds = []
    rounds.forEach(round => {
      userData.rounds.push({
        ...round.data(),
        roundId: round.id
      })
    })

    return res.json(userData)

  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.code })
  }
}

// Get own user details
const getAuthUserData = async (req, res) => {
  // Set empt object to store current user data in. Return at end
  let userData = {};

  try {
    const userDoc = await db.collection('users').doc(`${req.body.username}`).get()
    if (userDoc.exists) {
      userData.credentials = userDoc.data()
    }

    // Get user likes
    const userLikes = await db.collection('likes').where('username', '==', req.body.username).get()
    userData.likes = []
    userLikes.forEach(like => {
      userData.likes.push(like.data())
    })

    // Get user notifications
    const userNotifications = await db.collection('notifications').where('recipient', '==', req.body.username).get()
    userData.notifications = []
    userNotifications.forEach(notification => {
      userData.notifications.push({
        ...notification.data(),
        notificationId: notification.id
      })
    })

    return res.json(userData)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.code })
  }
}

// Upload profile image for user
const uploadImage = async (req, res) => {
  const Busboy = require('busboy')
  const path = require('path')
  const os = require('os')
  const fs = require('fs')

  // Start new instance of Busboy to handle img files
  const busboy = new Busboy({ headers: req.headers })

  let imageFileName;
  let imageToBeUploaded = {}

  try {
    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      if (mimetype !== 'image/jpeg' && mimetype !== 'image/png') return res.status(400).json({ error: 'Please upload image file type' })
      console.log(fieldname, filename, mimetype)
      // Get extension 'image.jpg'. Need .jpg
      const imageExtension = filename.split('.').pop()

      // Set a random file name. Ex 78564.jpg
      imageFileName = `${Math.round(Math.random() * 100000000)}.${imageExtension}`

      // Get file path
      const filepath = path.join(os.tmpdir(), imageFileName);

      // Create image to be uploaded
      imageToBeUploaded = { filepath, mimetype }

      file.pipe(fs.createWriteStream(filepath))
    })

    // On Finish - save image to storage bucket
    busboy.on('finish', async () => {
      await bucket.upload(imageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype
          }
        }
      })

      // After saving to storave bucket, get image URL and add it to user doc.
      const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${functions.config().my_keys.bucket_key ? functions.config().my_keys.bucket_key : process.env.FIREBASE_BUCKET}/o/${imageFileName}?alt=media`
      // const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${process.env.FIREBASE_BUCKET}/o/${imageFileName}?alt=media`
      await db.doc(`/users/${req.body.username}`).update({ imageUrl })

      return res.json({ message: 'Image uploaded successfully' })

    })

    busboy.end(req.rawBody)

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.code })
  }
}

const markNotificationsRead = async (req, res) => {

}

module.exports = { registerUser, loginUser, uploadImage, addUserDetails, getAuthUserData, getUserByUsername, markNotificationsRead }