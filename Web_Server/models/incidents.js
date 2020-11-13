var mongoose = require('mongoose');

var incidentSchema = new mongoose.Schema({
    device_id: Number,
    incident_time: Date,
    incident_type: String
});

module.exports = mongoose.model("Incident", incidentSchema);