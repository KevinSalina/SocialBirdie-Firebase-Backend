
# Social Birde - Backend

Social Birde is a mock social media app for golfers. The end goal is to have a web applicaiton that allows users to register, login, share & post about their rounds of golf, view user profiles, like, comment, and get notifications.
Similar to [Hole19](https://www.hole19golf.com/) social feed.




## Tech Stack

**Client:** React, React Router, Material UI (todo: Redux)

**Server:** Firebase Firestore, Firebase Cloud Functions, Firebase Auth, Node, Express



  
## API Reference

#### Get all rounds

```http
  GET /api/rounds
```

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `api_key` | `string` | **Required**. Your API key |

#### Get round by id

```http
  GET /api/round/${id}
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `id`      | `string` | **Required**. Id of round |


## to be continued..

  