// Helper Function for empty string
const isEmpty = string => string.trim() === ''

// Helper function for email check
const isValidEmail = (email) => {
  const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return emailRegEx.test(email)
}

const validateSignUp = (user) => {
  let errors = {}

  if (isEmpty(user.email)) {
    errors.email = 'Please enter email'
  } else if (!isValidEmail(user.email)) {
    errors.email = 'Invalid email'
  }

  if (isEmpty(user.password)) errors.password = 'Please enter password'
  if (user.password !== user.confirmPassword) errors.confirmPassword = 'Passwords do not match'

  if (isEmpty(user.username)) errors.username = 'Please enter username'

  return {
    errors,
    valid: !Object.keys(errors).length > 0
  }
}

const validateLogin = (user) => {
  let errors = {}

  if (isEmpty(user.email)) errors.email = 'Please enter email'
  if (isEmpty(user.password)) errors.password = 'Please enter password'

  return {
    errors,
    valid: !Object.keys(errors).length > 0
  }
}

const reduceUserDetails = (data) => {
  let userDetails = {}

  if (!isEmpty(data.bio.trim())) userDetails.bio = data.bio
  if (!isEmpty(data.location.trim())) userDetails.location = data.location

  return userDetails
}

module.exports = { validateSignUp, validateLogin, reduceUserDetails }