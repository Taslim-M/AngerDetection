var mongoose = require('mongoose');
var autoIncrement = require('mongoose-auto-increment');

var connection = mongoose.createConnection("mongodb://localhost:27017/iot_anger");
 
autoIncrement.initialize(connection);

var userSchema = new mongoose.Schema({
    id: Number,
    name: String,
    mobile: String,
    email: String,
    guardian: [Number]
});
userSchema.plugin(autoIncrement.plugin, { model: 'User', field: 'id' });

module.exports = mongoose.model("User", userSchema);