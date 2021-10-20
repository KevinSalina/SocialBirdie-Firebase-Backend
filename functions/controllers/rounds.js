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
      userImage: req.body.imageUrl,
      createdAt: new Date().toISOString(),
      likeCount: 0,
      commentCount: 0
    }
    const addedRound = await db.collection('rounds').add(newRound)
    newRound.roundId = addedRound.id
    return res.json(newRound)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Something went wrong' })
  }
}

// Delete a round. Protected
const deleteRound = async (req, res) => {
  try {
    const { roundId } = req.params
    const { username } = req.body
    // Make round reference 
    const roundRef = db.collection('rounds').doc(`${roundId}`)
    // Get round from colleciton
    const roundSnapshot = await roundRef.get()
    // If round does not exist, return 404
    if (!roundSnapshot.exists) return res.status(404).json({ error: 'Round not found' })
    // If current user does not owen round, return 401
    if (roundSnapshot.data().username !== username) return res.status(401).json({ error: 'Unauthorized' })
    // If no errors, delete round
    await roundRef.delete()
    return res.status(200).json({ message: `Round ${roundSnapshot.id} deleted successfully` })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.code })
  }
}

// Create a new comment on a round. Protected
const createComment = async (req, res) => {
  const { roundId } = req.params
  const { body, username, imageUrl } = req.body
  // Validate there is comment text
  if (body.trim() === '') return res.status(400).json({ comment: 'Please enter comment' })
  const newComment = {
    body,
    username,
    roundId,
    createdAt: new Date().toISOString(),
    userImage: imageUrl
  }
  try {
    // Check if round exists
    const snapshotRound = await db.collection('rounds').doc(`${roundId}`).get()
    if (!snapshotRound.exists) return res.status(404).json({ error: 'Round not found' })
    // Add new comment to comments collection if round exists
    await db.collection('comments').add(newComment)
    snapshotRound.ref.update({ commentCount: snapshotRound.data().commentCount + 1 })
    return res.status(200).json(newComment)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.code })
  }
}

// Like a round. Protected
const likeRound = async (req, res) => {
  const { roundId } = req.params
  const { username } = req.body
  let roundData = {}
  try {
    // Check if round exists and if so save data to roundData object
    const roundSnapshot = await db.collection('rounds').doc(`${roundId}`).get()
    if (!roundSnapshot.exists) return res.status(404).json({ error: 'Round not found' })
    roundData = roundSnapshot.data()
    roundData.roundId = roundSnapshot.id
    // Check for like
    const likeSnapshot = await db.collection('likes').where('username', "==", username).where('roundId', '==', roundId).limit(1).get()
    // If no like is found - create a like in likes collection using round id and current user username, and then update round likeCount.
    if (likeSnapshot.empty) {
      await db.collection('likes').add({ roundId, username })
      roundData.likeCount++
      await db.collection('rounds').doc(`${roundId}`).update({ likeCount: roundData.likeCount })
      return res.json(roundData)
    } else {
      return res.status(400).json({ error: 'Round already liked' })
    }
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: err.code })
  }
}

// Unlike round. Protected
const unlikeRound = async (req, res) => {
  const { roundId } = req.params
  const { username } = req.body
  let roundData = {}
  try {
    // Check if round exists and if so save data to roundData object
    const roundSnapshot = await db.collection('rounds').doc(`${roundId}`).get()
    if (!roundSnapshot.exists) return res.status(404).json({ error: 'Round not found' })
    roundData = roundSnapshot.data()
    roundData.roundId = roundSnapshot.id
    // Check for like
    const likeSnapshot = await db.collection('likes').where('username', "==", username).where('roundId', '==', roundId).limit(1).get()
    // If no like is found - throw error. If like is found, delete like and decrease round Id like count
    if (likeSnapshot.empty) {
      return res.status(400).json({ error: 'Round not liked' })
    } else {
      await db.collection('likes').doc(`${likeSnapshot.docs[0].id}`).delete()
      roundData.likeCount === 0 ? roundData.likeCount = 0 : roundData.likeCount--
      await db.collection('rounds').doc(`${roundId}`).update({ likeCount: roundData.likeCount })
      return res.json(roundData)
    }
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: err.code })
  }
}

module.exports = { getAllRounds, createRound, deleteRound, getRoundById, createComment, likeRound, unlikeRound }