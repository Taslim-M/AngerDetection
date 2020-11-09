var mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
    id: Number,
    name: String,
    mobile: String,
    email: String,
    guardian: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ]
});

module.exports = mongoose.model("User", userSchema);