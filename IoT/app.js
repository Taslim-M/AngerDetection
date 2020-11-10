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
app.set("view engine", "ejs");

//Routes

app.get("/", function (req, res) {
    res.render("index");
});
app.get("/add-user", function (req, res) {
    res.render("add_user");
});


app.get("/incidents", async function (req, res) {
    var userID = req.query.userid;
    const users_found = await User.find({ 'guardian': userID });

    device_list = [];
    for(user of users_found){
        const device =  await Device.findOne({"user_id": user.id});
        device_list.push(device);
    }
    // res.send(device_list);

    incidents_list = [];
    for(device of device_list){
        const incidents_now =  await Incident.find({"device_id": device.device_id});
        console.log(incidents_now);
        incidents_list.push(...incidents_now);
    }
    console.log(incidents_list);
    // res.send(incidents_list);
    res.render("incidents",{incidents: incidents_list})

});

//start server
app.listen(process.env.PORT || 3000, function () { console.log("Server Started"); });