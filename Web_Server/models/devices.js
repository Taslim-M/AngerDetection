var mongoose = require('mongoose');

var deviceSchema = new mongoose.Schema({
    device_id: {type: Number, unique: true,  required: true},
    user_id: {type: Number, required: true},
    live_stream_ip: {type: String, required: true},
});

module.exports = mongoose.model("Device", deviceSchema);