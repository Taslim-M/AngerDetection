var mongoose = require("mongoose");

var User = require("./models/users");
var Device = require("./models/devices");
var Incident = require("./models/incidents");
var seed_user = [
    {

        name: "John Cena",
        mobile: "0506999999",
        email: "johncena@google.com",
        guardian: []
    },
    {

        name: "Kelly Ma",
        mobile: "0502229999",
        email: "Kelly@google.com",
        guardian: [1]
    },
    {

        name: "Mariam Hossain",
        mobile: "0501119999",
        email: "Mariam@google.com",
        guardian: [1]
    }
];

var seed_device = [
    {
        device_id: 322,
        user_id: 2,
        live_stream_ip: "http://127.0.0.1/2330"
    },
    {
        device_id: 422,
        user_id: 3,
        live_stream_ip: "http://127.0.0.2/2330"
    }
];

var d = new Date();
d.setHours(d.getHours() - 2);

var seed_incident = [
    {
        device_id: 322,
        incident_time: d,
        incident_type: "Anger"
    },
    {
        device_id: 322,
        incident_time: Date.now(),
        incident_type: "Position"
    },
    {
        device_id: 422,
        incident_time: Date.now(),
        incident_type: "Anger"
    },
    {
        device_id: 422,
        incident_time: d,
        incident_type: "Position"
    },
];


async function seedDB() {
    try {
        await User.remove({});
        await Device.remove({});
        await Incident.remove({});
        for (const seed of seed_user) {
            let user = await User.create(seed);
            user.save();
        }
        for (const seed of seed_device) {
            let device = await Device.create(seed);
            device.save();
        }
        for (const seed of seed_incident) {
            let incident = await Incident.create(seed);
            incident.save();
        }
    } catch (err) {
        console.log(err);
    }

};

module.exports = seedDB;