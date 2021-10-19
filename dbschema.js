let dbSchema = {
  users: [
    {
      userId: 'CkYKi9mL71XJZaAAdPSV2AEMmL92',
      email: 'user99@gmail.com',
      iamgeURL: 'https://firebasestorage.googleapis.com/v0/b/socialbirdie-d941f.appspot.com/o/97518578.jpg?alt=media',
      username: 'user99',
      createdAt: '2021-10-19T16:40:50.146Z',
      bio: 'I love to golf!',
      location: 'CT, USA'
    }
  ],
  rounds: [
    {
      userHandle: 'userName',
      course: 'Course Name',
      numHoles: 9,
      par: 36,
      score: 41,
      createdAt: '2021 - 10 - 16T01: 26: 34.353Z',
      likeCount: 5,
      commentCount: 2
    }
  ],
  comments: [
    {
      username: 'user',
      roundId: '12345',
      body: 'This is a comment!',
      createdAt: '2021-10-19T16:40:50.146Z'
    }
  ],
  likes: [
    {
      username: 'user',
      roundId: '12345'
    }
  ]
};

let userReduxDetails = {
  // Redux data
  credentials: {
    userId,
    email,
    username,
    createdAt,
    imageUrl,
    bio,
    location
  },
  likes: [
    {
      username,
      roundId
    },
    {
      username,
      roundId
    }
  ]
}