const admin = require('firebase-admin');
const functions = require('firebase-functions')
const serviceAccount = require('../ServiceAccountKey.json')

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: `${functions.config().my_keys.bucket_key ? functions.config().my_keys.bucket_key : process.env.FIREBASE_BUCKET}`
  // storageBucket: `${process.env.FIREBASE_BUCKET}`
})
const db = admin.firestore()
const bucket = admin.storage().bucket()

module.exports = { admin, db, bucket }