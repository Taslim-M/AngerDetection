const incidents = require('./models/incidents');

var express = require('express'),
    app = express(),
    bodyParser = require("body-parser"),
    mongoose = require('mongoose'),
    User = require("./models/users"),
    Device = require("./models/devices"),
    Incident = require("./models/incidents"),
    seedDb = require("./seeds");

mongoose.connect('mongodb://localhost:27017/iot_anger', { useNewUrlParser: true, useUnifiedTopology: true });

seedDb();


app.use(express.static(__dirname + "/public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.set("view engine", "ejs");

//Routes

app.get("/", function (req, res) {
    res.render("index");
});
app.get("/add_user", function (req, res) {
    res.render("add_user");
});

app.post("/add_user", function (req, res) {
    var user_id = req.body.user_id;
    var name = req.body.name;
    var mobile = req.body.mobile;
    var email = req.body.email;
    var guardian_str = req.body.guardian.split(',');
    var guardian = [];
    for (num of guardian_str) {
        guardian.push(Number(num));
    }

    var user_to_add = {
        "id": user_id,
        "name": name,
        "mobile": mobile,
        "email": email,
        "guardian": guardian
    }
    User.create(user_to_add, function (err, new_user) {
        if (err) {
            console.log(err);
            res.render("add_user", { msg: "Sorry there was some error, try again" });
        } else {

            res.render("add_user", { msg: "SUCCESS! Thank you for registering " + new_user.name + ". Your ID is " + new_user.id });
        }
    });

});

app.get("/add_device", function (req, res) {
    res.render("add_device");
});

app.post("/add_device", function (req, res) {
    var device_id = req.body.device_id;
    var user_id = req.body.user_id;
    var live_stream_ip = req.body.live_stream_ip;

    var device_to_add = {
        "device_id": device_id,
        "user_id": user_id,
        "live_stream_ip": live_stream_ip
    }
    Device.create(device_to_add, function (err, new_device) {
        if (err) {
            console.log(err);
            res.render("add_device", { msg: "Sorry there was some error, try again" });
        } else {
            res.render("add_device", { msg: "SUCCESS! Thank you for adding device with ID: " + new_device.device_id });
        }
    });
});

app.get("/incidents", async function (req, res) {
    var userID = req.query.userid;
    const users_found = await User.find({ 'guardian': userID });

    device_list = [];
    for (user of users_found) {
        const device = await Device.findOne({ "user_id": user.id });
        device_list.push(device);
    }
    // res.send(device_list);

    incidents_list = [];
    for (device of device_list) {
        const incidents_now = await Incident.find({ "device_id": device.device_id });
        console.log(incidents_now);
        incidents_list.push(...incidents_now);
    }
    console.log(incidents_list);
    // res.send(incidents_list);
    res.render("incidents", { incidents: incidents_list })

});

//Add Incidents from Edge
// app.post("/add_incident", async function (req, res) {
//     var new_inc = {
//         device_id: req.body.device_id,
//         incident_time: Date.now(),
//         incident_type: req.body.incident_type
//     }
//     let incident = await Incident.create(new_inc);
//     incident.save();
//     console.log("Added" + incident);
//     res.status(200).send(incident);
// });

//start server
app.listen(process.env.PORT || 3000, function () { console.log("Server Started"); });

//MQTT -----------------------------------------------
var mqtt = require('mqtt')
var client = mqtt.connect('ws://localhost:9001')

client.on('connect', function () {
    client.subscribe('incidents/#', function (err) {
        if (err) {
            console.log(err);
        }
    })
});

client.on('message', async function (topic, message) {
    data =JSON.parse(message.toString());
    console.log(data)
    var new_inc = {
        device_id: data.device_id,
        incident_time: Date.now(),
        incident_type: data.incident_type
    }
    let incident = await Incident.create(new_inc);
    incident.save();
    console.log("Added" + incident);
});

app.post("/flutter_disable_notifs", function (req, res) {
    console.log("Rcvd: " + req.body.notifMode);
    res.status(200).send({});
});

//start server
app.listen(process.env.PORT || 3000, function () { console.log("Server Started"); });
