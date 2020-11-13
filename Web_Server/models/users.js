var mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
    id: Number,
    name: String,
    mobile: String,
    email: String,
    guardian: [Number]
});

module.exports = mongoose.model("User", userSchema);