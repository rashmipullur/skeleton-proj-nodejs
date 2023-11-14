const HTTP = require("../constants/responseCode.constant");
const { users } = require("../models/user.model");
const { genSaltSync, hashSync, compareSync } = require("bcrypt");
const {
  encryptUserModel,
  sendEmailOTP,
  createSessionAndJwtToken,
} = require("../public/partials/utils");
var randomstring = require("randomstring");
const jwt = require("jsonwebtoken");

/*
console.log(pm.response.json(), "pm.response.json()-----------")

if(pm.response.json().data){
    // var cryptoJs = require('crypto-js')
    // const bytes = cryptoJs.AES(pm.response.json().data, "thisiscryptosecret")
    // const plainData = JSON.parse(bytes.toString(cryptoJs.enc.Utf8));
    console.log(pm.response.json().data, "pm.response.json().data")
    // console.log(plainData, "plainData")
    // if(plainData.code === 200){
    //     const token = plainData.data.token.split(' ')
    //     pm.environment.set('authToken', token[1])
    // }
    if(pm.response.json().code === 200){
        const token = pm.response.json().data.token.split(' ')
        pm.environment.set('authToken', token[1])
    }
}
*/

// register data and send email
async function signup(req, res) {
  try {
    let { email, username, password } = req.body;

    if (!email || !username || !password)
      return res.status(HTTP.SUCCESS).send({
        status: false,
        code: HTTP.NOT_FOUND,
        message: "All fields are required",
        data: {},
      });

    if (!email.includes("@"))
      return res.status(HTTP.SUCCESS).send({
        status: false,
        code: HTTP.BAD_REQUEST,
        message: "Email is invalid!",
        data: {},
      });

    if (password.length < 8 || password.length > 16) {
      return res.status(HTTP.SUCCESS).send({
        status: false,
        code: HTTP.BAD_REQUEST,
        message: "Password weak re-enter.",
        data: {},
      });
    } else {
      const salt = genSaltSync(10);
      password = hashSync(password, salt);
    }

    const encData = await encryptUserModel({ email });

    // check + verified ?
    const userValid = await users.findOne({
      $and: [{ email: encData.email }, { isVerified: false }],
    });
    if (userValid)
      return res.status(HTTP.SUCCESS).send({
        status: "false",
        code: HTTP.BAD_REQUEST,
        message: "User exist. Please complete email verification.",
      });
    else {
      const otpCheck = randomstring.generate({
        length: 4,
        charset: "numeric",
      });
      console.log(otpCheck, "otpCheck");
      const userData = await new users({
        email,
        username,
        password,
        otpCheck,
      }).save();

      if (!userData) {
        return res.status(HTTP.SUCCESS).send({
          status: false,
          code: HTTP.BAD_REQUEST,
          message: "Unable to register user!",
          data: {},
        });
      }

      // ================== send email template ===================
      var sendMailData = {
        file_template: "./src/public/EmailTemplates/verifyOtp.html",
        subject: "Verify Email",
        to: email ? email : null,
        username: `${username}`,
        otp: `${otpCheck}`,
      };

      sendEmailOTP(sendMailData)
        .then((val) => {
          return res.status(HTTP.SUCCESS).send({
            status: true,
            code: HTTP.SUCCESS,
            message: "Please check your email.",
            data: val,
          });
        })
        .catch((err) => {
          console.log(err);
          return res.status(HTTP.SUCCESS).send({
            status: false,
            code: HTTP.BAD_REQUEST,
            message: "Unable to send email!",
            data: {},
          });
        });
    }

    return res.status(HTTP.SUCCESS).send({
      status: true,
      code: HTTP.SUCCESS,
      message: "User Registered! Check your email to verify.",
      data: {},
    });
  } catch (e) {
    console.log(e);
    return res.status(HTTP.SUCCESS).send({
      status: false,
      code: HTTP.INTERNAL_SERVER_ERROR,
      message: "Something went wrong!",
      data: {},
    });
  }
}

// verify otp
async function verifyOtp(req, res) {
  try {
    const { email, otp } = req.body;
    let result;
    if (!otp)
      return res.status(HTTP.SUCCESS).send({
        status: false,
        code: HTTP.NOT_ALLOWED,
        message: "provide otp to verify!",
        data: {},
      });
    const encData = await encryptUserModel({ email });
    const userData = await users.findOne({ email: encData.email }); // , isVerified: false
    if (!userData)
      return res.status(HTTP.SUCCESS).send({
        status: false,
        code: HTTP.BAD_REQUEST,
        message: "Email is Invalid!",
        data: {},
      });

    if (userData.isVerified)
      return res.status(HTTP.SUCCESS).send({
        status: false,
        code: HTTP.BAD_REQUEST,
        message: "User already verified!!",
        data: {},
      });

    if (otp == userData.otpCheck) {
      const update = await users.findOneAndUpdate(
        { email: encData.email },
        { isVerified: true, otpCheck: 0 },
        { new: true }
      );
      if (!update)
        return res.status(HTTP.SUCCESS).send({
          status: false,
          code: HTTP.NOT_ALLOWED,
          message: "Could not update verification",
          data: {},
        });

      //genrate JWT token and store session data
      const authToken = await createSessionAndJwtToken(update);

      return res.status(HTTP.SUCCESS).send({
        status: true,
        code: HTTP.SUCCESS,
        message: "Email Verified!",
        data: {
          userData: {
            id: update._id,
            username: update.username,
            email: update.email,
          },
          token: "Bearer " + authToken,
        },
      });
    } else {
      return res.status(HTTP.SUCCESS).send({
        status: false,
        code: HTTP.BAD_REQUEST,
        message: "Invalid Otp!",
        data: {},
      });
    }
  } catch (e) {
    console.log(e);
    return res.status(HTTP.SUCCESS).send({
      status: false,
      code: HTTP.INTERNAL_SERVER_ERROR,
      message: "Something went wrong!",
      data: {},
    });
  }
}

// resend otp
async function resendOtp(req, res) {
  try {
    const { email } = req.body;

    const encData = await encryptUserModel({ email });

    // check if already verified
    const checkVerified = await users.findOne({ email: encData.email });
    if (!checkVerified)
      return res.status(HTTP.SUCCESS).send({
        status: false,
        code: HTTP.BAD_REQUEST,
        message: "Unable to find User!",
        data: {},
      });

    if (checkVerified.isVerified)
      return res.status(HTTP.SUCCESS).send({
        status: false,
        code: HTTP.BAD_REQUEST,
        message: "User is already verified! ",
        data: {},
      });

    // generate otp
    const newOtp = randomstring.generate({ length: 4, charset: "numeric" });

    // update that otp in user model aswell
    const updateData = await users.findOneAndUpdate(
      { _id: checkVerified._id },
      { otpCheck: newOtp }
    );
    if (!updateData)
      return res.status(HTTP.SUCCESS).send({
        status: false,
        code: HTTP.BAD_REQUEST,
        message: "Could not update otp in  database!",
        data: {},
      });

    // resend otp email template ===========================

    var sendMailData = {
      file_template: "./src/public/EmailTemplates/verifyOtp.html",
      subject: "Resent OTP",
      to: email ? email : null,
      username: `${checkVerified.username}`,
      otp: `${newOtp}`,
    };

    sendEmailOTP(sendMailData)
      .then((val) => {
        return res.status(HTTP.SUCCESS).send({
          status: true,
          code: HTTP.SUCCESS,
          message: "Please check your email.",
          data: val,
        });
      })
      .catch((err) => {
        console.log(err);
        return res.status(HTTP.SUCCESS).send({
          status: false,
          code: HTTP.BAD_REQUEST,
          message: "Unable to send email!",
          data: {},
        });
      });

    return res.status(HTTP.SUCCESS).send({
      status: true,
      code: HTTP.SUCCESS,
      message: "Otp Resent, check mail!",
      data: {},
    });
  } catch (e) {
    console.log(e);
    return res.status(HTTP.SUCCESS).send({
      status: false,
      code: HTTP.INTERNAL_SERVER_ERROR,
      message: "Something went wrong!",
      data: {},
    });
  }
}

//signin
async function signin(req, res) {
  try {
    let { password, /*email,*/ emailorUsername } = req.body;

    if (!req.body || !password /*|| !email*/ || !emailorUsername)
      return res.status(HTTP.SUCCESS).send({
        status: false,
        code: HTTP.NOT_ALLOWED,
        message: "Provide email and password",
        data: {},
      });

    // condition to check which data user has been given
    if (emailorUsername.includes("@")) {
      const encData = await encryptUserModel({ email: emailorUsername });
      result = await users.findOne({ email: encData.email });
    } else {
      result = await users.findOne({ username: emailorUsername });
    }

    if (!result)
      return res.status(HTTP.SUCCESS).send({
        status: false,
        code: HTTP.NOT_FOUND,
        message: "User does not exist",
        data: {},
      });

    if (!result.isVerified)
      return res.status(HTTP.SUCCESS).send({
        status: false,
        code: HTTP.BAD_REQUEST,
        message: "Account is not verified. Please complete Otp verification.",
        data: {},
      });

    // check if user is blocked

    if (result.blocked)
      return res.status(HTTP.SUCCESS).send({
        status: false,
        code: HTTP.BAD_REQUEST,
        message: "Your account has been Blocked by Admin!",
        data: {},
      });

    if (!compareSync(password, result.password))
      return res.status(HTTP.SUCCESS).send({
        status: false,
        code: HTTP.BAD_REQUEST,
        message: "Password is wrong",
        data: {},
      });

    //genrate JWT token and store session data
    const token = await createSessionAndJwtToken(result);

    return res.status(HTTP.SUCCESS).send({
      status: true,
      code: HTTP.SUCCESS,
      message: "You have signed-in successfully.",
      data: {
        userData: {
          id: result._id,
          username: result.username,
          email: result.email,
        },
        token: "Bearer " + token,
      },
    });
  } catch (e) {
    console.log(e);
    return res.status(HTTP.SUCCESS).send({
      status: false,
      code: HTTP.INTERNAL_SERVER_ERROR,
      message: "Something went wrong!",
      data: {},
    });
  }
}

//forgot password
async function forgotPassword(req, res) {
  try {
    let { email } = req.body;
    if (!email)
      return res.status(HTTP.SUCCESS).send({
        success: false,
        code: HTTP.NOT_ALLOWED,
        message: "provide email",
        data: {},
      });

    const encData = await encryptUserModel({ email });

    result = await users.findOne({ email: encData.email });
    if (!result) {
      return res.status(HTTP.SUCCESS).send({
        success: false,
        code: HTTP.NOT_FOUND,
        message: "Record not found",
        data: {},
      });
    }

    const token = jwt.sign(
      { id: result._id, email: result.email },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );
    const link = `${process.env.REACT_ADMIN_APP_WEB_URL}/${result.id}/${token}`;

    console.log("🚀 ~ forgotPassword ~ link", link);
    // send link ==================================================
    var sendMailData = {
      file_template: "./src/public/EmailTemplates/forgotPassword.html",
      subject: "Link to reset the password",
      to: result.email ? result.email : null,
      link: link,
      username: result.username,
    };

    sendEmailOTP(sendMailData)
      .then((val) => {
        return res.status(HTTP.SUCCESS).send({
          status: true,
          code: HTTP.SUCCESS,
          message: "Please check your email.",
          data: val,
        });
      })
      .catch((err) => {
        console.log(err);
        return res.status(HTTP.SUCCESS).send({
          status: false,
          code: HTTP.BAD_REQUEST,
          message: "Unable to send email!",
          data: {},
        });
      });

    return res.status(HTTP.SUCCESS).send({
      status: true,
      code: HTTP.SUCCESS,
      message: "User valid!",
      data: { token: "Bearer " + token },
    });
  } catch (err) {
    console.log(err);
    return res.status(HTTP.SUCCESS).send({
      status: false,
      code: HTTP.INTERNAL_SERVER_ERROR,
      message: "Something went wrong!",
      data: {},
    });
  }
}

//set new password
async function setNewPassword(req, res) {
  try {
    let { email, password, cpassword } = req.body;
    if (!req.body || !email || !password || !cpassword)
      return res.status(HTTP.SUCCESS).send({
        status: false,
        code: HTTP.NOT_ALLOWED,
        message: "All fields are required!",
        data: {},
      });

    //check password
    if (password != cpassword)
      return res.status(HTTP.SUCCESS).send({
        status: false,
        code: HTTP.NOT_ALLOWED,
        message: "Password and confirm password does not match",
        data: {},
      });

    if (password.trim().length < 8 || password.trim().length > 16) {
      return res.status(HTTP.SUCCESS).send({
        status: false,
        code: HTTP.NOT_ALLOWED,
        message: "Password must be between of 8 to 16 characters!",
        data: {},
      });
    }

    const enc = await encryptUserModel({ email });

    const userData = await users.findOne({ email: enc.email });
    if (!userData)
      return res.status(HTTP.SUCCESS).send({
        status: false,
        code: HTTP.NOT_ALLOWED,
        message: "User does not exists!",
        data: {},
      });

    const isNewPassword = compareSync(password, userData.password);
    if (isNewPassword || isNewPassword === undefined)
      return res.status(HTTP.SUCCESS).send({
        status: false,
        code: HTTP.NOT_ALLOWED,
        message: "New password cannot be same as current password !",
        data: {},
      });

    const salt = genSaltSync(10);
    password = hashSync(password, salt);

    const result = await users.findOneAndUpdate(
      { email: enc.email },
      { password },
      { new: true }
    );
    if (!result)
      return res.status(HTTP.SUCCESS).send({
        status: false,
        code: HTTP.NOT_ALLOWED,
        message: "Unable to set new password!",
        data: {},
      });

    return res.status(HTTP.SUCCESS).send({
      status: true,
      code: HTTP.SUCCESS,
      message: "New Password has been set",
      data: {},
    });
  } catch (err) {
    console.log(err);
    return res.status(HTTP.SUCCESS).send({
      status: false,
      code: HTTP.INTERNAL_SERVER_ERROR,
      message: "Something went wrong!",
      data: {},
    });
  }
}

module.exports = {
  signup,
  verifyOtp,
  resendOtp,
  signin,
  forgotPassword,
  setNewPassword,
};
