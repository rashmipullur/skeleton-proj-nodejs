const HTTP = require('../constants/responseCode.constant')
const { users } = require('../models/user.model')
const { genSaltSync, hashSync, compareSync } = require('bcrypt')
const { encryptUserModel } = require("../public/partials/utils")


/*
if(pm.response.json().data{
    var cryptoJs = require('crypto-js')
    const bytes = cryptoJS.AES.decrypt(pm.response.json().data, "thisisthecryptosecret")
    const plainData = JSON.parse(bytes.toString(cryptoJS.enc.Utf8));
    if(plainData.code === 200){
        const token = plainData.data.token.split(' ')
        pm.environment.set('authToken', token[1])
    }
} 
*/
// register data and send email
async function signup(req, res){
    try{
        let { email, username, password } = req.body
        console.log("🚀 ~ file: user.controller.js:7 ~ signup ~ req.body:", req.body)
        if(!email || !username || !password) return res.status(HTTP.SUCCESS).send({"status": false, "code": HTTP.NOT_FOUND, "message": "All fields are required", "data": {}})

        if(!email.includes('@')) return res.status(HTTP.SUCCESS).send({"status": false, "code": HTTP.BAD_REQUEST, "message": "Email is invalid!", "data": {}})

        if(password.length < 8 || password.length > 16){
            return res.status(HTTP.SUCCESS).send({"status": false, "code": HTTP.BAD_REQUEST, "message": "Password weak re-enter.", "data": {}})
        } else {
            const salt = genSaltSync(10)
            password = hashSync(password, salt)
        }

        const encData = await encryptUserModel({email})

        // check + verified ?
        const userValid = await users.findOne({ $and: [{ email: encData.email }, { isVerified: false }] })
        if(userValid) return res.status(HTTP.SUCCESS).send({ "status": "false", "code": HTTP.BAD_REQUEST, "message": "User not verified. Please complete OTP Verification."   })
        // ======================================================================================================================


        return res.status(HTTP.SUCCESS).send({ "status": true, 'code': HTTP.SUCCESS, "message": "User Registered! Check your email to verify.", data: {} })

    } catch (e) {
        console.log(e)
        return res.status(HTTP.SUCCESS).send({ "status": false, 'code': HTTP.INTERNAL_SERVER_ERROR, "message": "Something went wrong!", data: {} })
    }
}

module.exports = {
    signup,

}