const functions = require("firebase-functions");
const admin = require('firebase-admin');

// Firebase App Initi
admin.initializeApp()
const db = admin.firestore()

// Get All Golf Rounds
exports.getRounds = functions.https.onRequest(async (req, res) => {
  try {
    const snapshot = await db.collection('rounds').get()
    let allRounds = []
    snapshot.forEach(doc => {
      allRounds.push(doc.data())
    })
    return res.json(allRounds)
  } catch (err) {
    console.error(err)
  }
})

exports.createRound = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(400).json({ error: 'Method not allowed' })
  }
  try {
    const { course, numHoles, par, score, userHandle } = req.body
    const newRound = {
      course,
      numHoles,
      par,
      score,
      userHandle,
      createdAt: admin.firestore.Timestamp.fromDate(new Date())
    }

    const addedRound = await db.collection('rounds').add(newRound)
    res.json({ message: `Round ${addedRound.id} created successfully!` })
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong' })
    console.error(err)
  }
})
