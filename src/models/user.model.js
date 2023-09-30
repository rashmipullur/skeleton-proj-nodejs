var mongoose = require('mongoose')
const { Schema, model } = require('mongoose')
const mongooseFieldEncryption = require('mongoose-field-encryption').fieldEncryption

const user = new Schema({

    email: {
        type: String,
        required: true,
        unique: true, 
        trim: true,
        lowercase: true
    },
    username: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: [true, "Required"],
        trim: true
    },
    role: {
        type: String,
        default: 'user',
        trim: true
    },
    isVerified:{
        type: Boolean,
        default: false
    }

}, { timestamps: true, versionKey: false })

user.plugin(mongooseFieldEncryption, {
    fields: ["email"],
    secret: "somesecretkey",
    saltGenerator: function(secret){
        return "1234567890123456";
    }
});

const users = model( "users", user )
module.exports = { users }