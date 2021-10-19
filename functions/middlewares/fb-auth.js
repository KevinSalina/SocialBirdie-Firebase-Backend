const { db, admin } = require('../config/admin')

// Authorization Middleware
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

module.exports = { FBAuth }