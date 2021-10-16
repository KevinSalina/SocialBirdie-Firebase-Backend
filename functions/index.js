const functions = require("firebase-functions");
const admin = require('firebase-admin');
const express = require('express')
const app = express()

// Firebase App Initi
admin.initializeApp()
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


// Export all routes with /api
exports.api = functions.https.onRequest(app);