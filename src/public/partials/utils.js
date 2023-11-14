const { users } = require("../../models/user.model");
const nodemailer = require("nodemailer");
const fs = require("file-system");
const handlebars = require("handlebars");
const UserSession = require("../../models/userSession.model");
const jwt = require("jsonwebtoken");

//Encrypt User Model
async function encryptUserModel(data) {
  const userData = new users(data);
  userData.encryptFieldsSync({ __secret__: process.env.DATABASE_ACCESS_KEY });
  return userData;
}

const sendEmailOTP = (sendData) => {
  try {
    return new Promise(async (resolve) => {
      var file_template = sendData.file_template;
      var subject = sendData.subject;

      let transporter = nodemailer.createTransport({
        host: "sandbox.smtp.mailtrap.io",
        port: 2525,
        // secure: true,
        auth: {
          user: "a06c5059e86a22",
          pass: "8e4c2e74d7b847",
        },
      });

      fs.readFile(file_template, { encoding: "utf-8" }, function (err, html) {
        // if (err) console.log("---------> err --->" + err);

        var template = handlebars.compile(html);
        var htmlToSend = template(sendData);

        var mailOptions = {
          // from: ,
          to: sendData.to,
          subject: subject,
          html: htmlToSend,
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.log("error" + error);
            return { status: false, data: [], message: "Could not send mail!" };
          }

          console.log("info " + info);
          console.log("Message sent: %s", info.messageId);
          console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
          return { status: true, data: [], message: "mail sent!." };
        });
      });
    });
  } catch (e) {
    console.log(e);
    return res.status(HTTP.SUCCESS).send({
      status: false,
      code: HTTP.INTERNAL_SERVER_ERROR,
      message: "Unable to send email!",
      data: {},
    });
  }
};

//genrate JWT token store user session
async function createSessionAndJwtToken(user) {
  try {
    const expAt = new Date().getTime() / 1000 + 86400;

    const userSession = await new UserSession({
      userid: user._id,
      isActive: true,
      expAt: expAt.toFixed(),
    }).save();
    if (!userSession) {
      throw "Unable to store user session.";
    }
    // let payload = { result: { id: user._id, sessionId: userSession._id } }
    // token = sign(payload, process.env.JWT_SECRET, { expiresIn: "24h" });

    // sign the JWT token
    // const payload = { email: user.email, id: user._id, sessionId: userSession._id }
    // const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "Id" })

    //sign the JWT token
    const payload = {
      email: user.email,
      id: user._id,
      sessionId: userSession._id,
    };
    // const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" })
    const token = jwt.sign(payload, process.env.JWT_SECRET);
    

    return token;
  } catch (e) {
    console.log(e);
    throw "Unable to create session or genrate JWT token";
  }
}

//Expire session
async function checkSessionExpiration() {
  try {
    setInterval(async () => {
      await UserSession.updateMany(
        {
          isActive: true,
          $and: [
            { expAt: { $ne: 0 } },
            { expAt: { $lte: new Date().getTime() / 1000 } },
          ],
        },
        { $set: { isActive: false } }
      );
    }, 1000);
  } catch (err) {
    console.log(err);
  }
}


module.exports = {
  encryptUserModel,
  sendEmailOTP,
  createSessionAndJwtToken,
  checkSessionExpiration,
};
