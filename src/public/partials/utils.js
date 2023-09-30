const { users } = require("../../models/user.model")

//Encrypt User Model
async function encryptUserModel(data) {
    const userData = new users(data);
    userData.encryptFieldsSync({ __secret__: process.env.DATABASE_ACCESS_KEY });
    return userData
}

module.exports = {
    encryptUserModel
}