var mongoose = require('mongoose');

var deviceSchema = new mongoose.Schema({
    device_id: Number,
    user_id: Date,
    live_stream_ip: String
});

module.exports = mongoose.model("Device", deviceSchema);