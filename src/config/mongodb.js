const mongoose = require('mongoose')

function mongoConnect() {
    // database connection
    mongoose.connect(process.env.MONGODB, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }).then(() => console.log("DB connected successfully!"))
            .catch((err) => {
                console.log(err);
                console.log("Error connecting DB!");
            })
}

module.exports = mongoConnect()