var mongoose = require('mongoose');

var incidentSchema = new mongoose.Schema({
    device_id: {type: Number,  required: true},
    incident_time: {type: Date,  required: true},
    incident_type: {type: String,  required: true}
});

module.exports = mongoose.model("Incident", incidentSchema);