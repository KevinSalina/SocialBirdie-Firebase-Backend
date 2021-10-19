const { round } = require('lodash')
const { db } = require('../config/admin')


// Get All Rounds. Not protected
const getAllRounds = async (req, res) => {
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
}

// Get Round by Id. Not protected
const getRoundById = async (req, res) => {
  const { roundId } = req.params
  let roundData = {}

  try {

    // Get round data from firebase colleciton
    const roundSnapshot = await db.collection('rounds').doc(`${roundId}`).get()

    if (!roundSnapshot.exists) return res.status(404).json({ message: 'Round not found' })

    // Save data to our roundData variable
    roundData = roundSnapshot.data()
    roundData.roundId = roundSnapshot.id

    // Get comments assocaited with this round id
    const roundComments = await db.collection('comments').where('roundId', '==', roundId).orderBy('createdAt', 'desc').get()
    roundData.comments = []
    roundComments.forEach(comment => {
      roundData.comments.push({
        ...comment.data(),
        commentId: comment.id
      })
    })

    return res.status(200).json(roundData)

  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.code })
  }

}

// Create a new Round. Protected
const createRound = async (req, res) => {

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
}

// Create a new comment on a round
const createComment = async (req, res) => {
  const { roundId } = req.params
  const { body, username } = req.body

  // Validate there is comment text
  if (body.trim() === '') return res.status(400).json({ error: 'Please enter comment' })

  const newComment = {
    body,
    username,
    roundId,
    createdAt: new Date().toISOString(),
    userImage: req.body.imageUrl
  }

  try {
    // Check if round exists
    const snapshotRound = await db.collection('rounds').doc(`${roundId}`).get()
    if (!snapshotRound.exists) return res.status(404).json({ error: 'Round not found' })

    // Add new comment to comments collection if round exists
    await db.collection('comments').add(newComment)

    return res.status(200).json(newComment)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.code })
  }
}

module.exports = { getAllRounds, createRound, getRoundById, createComment }