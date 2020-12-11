var mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
    id: {type: Number, unique: true,  required: true},
    name: {type: String,  required: true},
    mobile:{type: String,  required: true},
    email: {type: String,  required: true},
    guardian: [Number]
});

module.exports = mongoose.model("User", userSchema);