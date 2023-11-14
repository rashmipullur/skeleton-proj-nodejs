const express = require('express')
const router = express.Router()
const userControllers = require('../controllers/user.controller')



// -----------------------------Authentication-----------------------------
router.post('/signup', userControllers.signup) // signup
router.post('/verifyOtp', userControllers.verifyOtp) // verify otp
router.post('/resendOtp', userControllers.resendOtp) // resentOtp
router.post('/signin', userControllers.signin) // sign in
router.post('/forgotPassword', userControllers.forgotPassword) // forgot password
router.put('/setNewPassword',  userControllers.setNewPassword) // setnewpassword





module.exports = router