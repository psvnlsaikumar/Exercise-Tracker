const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const User = require("./models/user");

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true
});

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.get("/api/exercise/users", function(req, res) {
  User.find({}, function(err, allUser) {
    if (err) return console.log(err);
    res.json(
      allUser.map(user => ({
        _id: user._id,
        username: user.username,
        __v: user.__v
      }))
    );
  });
});

app.post("/api/exercise/new-user", function(req, res) {
  let username = req.body.username;

  if (username === "") {
    res.send("<code>Path `username` is required.</code>");
  } else if (username.length > 12) {
    res.send("<code>username too long</code>");
  } else {
    const newUser = { username: username };
    User.findOne({ username: newUser.username }, (err, data) => {
      if (err) return console.log(err);
      if (data) {
        res.send("<code>username is already taken.<code>");
      } else {
        User.create(newUser, (err, newUser) => {
          if (err) return console.log(err);
          res.json({ username: newUser.username, _id: newUser._id });
        });
      }
    });
  }
});

function newData(data, arr) {
  return (
    (data.count = arr.length),
    (data.log = arr.map(log => ({
      description: log.description,
      duration: log.duration,
      date: log.date.toDateString()
    })))
  );
}

app.get("/api/exercise/log", function(req, res) {
  let userId = req.query.userId,
    from = new Date(req.query.from),
    to = new Date(req.query.to),
    limit = +req.query.limit;

  User.findById(userId, function(err, user) {
    if (err) console.log(err);
    if (user) {
      let log = user.log;
      let newLog = [];
      let data = {
        _id: user._id,
        username: user.username
      };

      if (!isNaN(from.valueOf()) && !isNaN(to.valueOf()) && !isNaN(limit)) {
        newLog = log.filter(log => log.date >= from && log.date <= to);
        data.from = from.toDateString();
        data.to = to.toDateString();
        let arrLog = [];
        if (limit > 0 && limit <= newLog.length) {
          for (let i = 0; i < limit; i++) {
            arrLog.push(newLog[i]);
          }
          newLog = arrLog;
        }
        newData(data, newLog);
      } else if (!isNaN(from.valueOf()) && !isNaN(to.valueOf())) {
        newLog = log.filter(log => log.date >= from && log.date <= to);
        data.from = from.toDateString();
        data.to = to.toDateString();
        newData(data, newLog);
      } else if (!isNaN(limit) && limit > 0 && limit <= log.length) {
        for (let i = 0; i < limit; i++) {
          newLog.push(log[i]);
        }
        newData(data, newLog);
      } else {
        newData(data, log);
      }

      res.json(data);
    } else {
      res.send("<code>unknown userId</code>");
    }
  });
});

app.post("/api/exercise/add", function(req, res) {
  let { userId, description, duration, date } = req.body;
  let log = { description, duration, date };

  if (userId) {
    User.findById(userId, function(err, user) {
      if (err) console.log(err);
      if (user) {
        user.log.push(log);
        user.save(function(err, user) {
          if (err) console.log(err);
          let newLog = user.log.length - 1;
          res.json({
            username: user.username,
            description: user.log[newLog].description,
            duration: user.log[newLog].duration,
            _id: userId,
            data: user.log[newLog].date.toDateString()
          });
        });
      } else {
        res.send("<code>unknown _id</code>");
      }
    });
  } else if (userId === "") {
    res.send("<code>unknown _id</code>");
  } else if (duration === "") {
    res.send("<code>Path `duration` is required.</code>");
  } else if (description === "") {
    res.send("<code>Path `description` is required.</code>");
  } else if (description > 20) {
    res.send("<code>description too long</code>");
  } else {
    res.send("<code>error</code>");
  }
});

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: "Not Found" });
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res
    .status(errCode)
    .type("txt")
    .send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});