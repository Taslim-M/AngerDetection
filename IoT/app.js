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

app.get("/incidents", function (req, res) {
    var userID = req.query.userid;
    console.log(userID);
    User.find({ 'guardian': userID }, function (err, user) {
        if (err) {
            console.log(err);
            res.render("index");
        } else {
            if (user) {
                res.send(user);
            }else{
                res.render("index");
            }

       
        }
    });

});

//start server
app.listen(process.env.PORT || 3000, function () { console.log("Server Started"); });