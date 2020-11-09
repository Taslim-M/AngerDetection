var mongoose = require("mongoose");

var User = require("./models/users");
var Device = require("./models/devices");

var seed_user = [
    {
        id: 1,
        name: "John Cena",
        mobile: "0506999999",
        email: "johncena@google.com",
        guardian: []
    },
    {
        id: 2,
        name: "Kelly Ma",
        mobile: "0502229999",
        email: "Kelly@google.com",
        guardian: [1]
    },
    {
        id: 3,
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


async function seedDB() {
    try {
        await User.remove({});
        await Device.remove({});
        for (const seed of seed_user) {
            let user = await User.create(seed);
            user.save();
        }
        for (const seed of seed_device) {
            let device = await Device.create(seed);
            device.save();
        }
    } catch (err) {
        console.log(err);
    }

};

module.exports = seedDB;