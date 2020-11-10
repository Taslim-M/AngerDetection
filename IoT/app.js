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
    for(num of guardian_str){
        guardian.push(Number(num));
    }
    console.log(guardian);
    var user_to_add = {
        "id": user_id,
        "name":name,
        "mobile": mobile,
        "email": email,
        "guardian" : guardian
    }
    console.log(user_to_add);
    User.create(user_to_add, function(err, new_user){
        if(err){
            console.log(err);
            res.render("add_user",{msg: "Sorry there was some error, try again"});
        }else{
            
            res.render("add_user", {msg:"SUCCESS! Thank you for registering "+ new_user.name + ". Your ID is " + new_user.id});
        }
    });
   
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