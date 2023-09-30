const express = require('express')
const router = express.Router()
const userControllers = require('../controllers/user.controller')



// -----------------------------Authentication-----------------------------
router.get('/status', (request, response) => {
    const status = {
       "Status": "Running"
    };
    console.log("heeeeeeeeeeeeeeeeeere");
    response.send(status);
 });
router.post('/signup', userControllers.signup) // signup
// verify otp
// resentOtp
// sign in
// forgot password
// verify forgot password otp
// setnewpassword

module.exports = router