require('dotenv').config();
const express = require('express');
const ejs = require('ejs');
const mongoose = require('mongoose');
//const encrypt = require('mongoose-encryption');
const md5 = require('md5');
const _ = require('lodash');

//init express
const app = express();
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

//connect db
mongoose.connect(process.env.DB_HOST + 'userDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', (err) => {
  if (err) {
    console.log(err);
  }
});
//setup the user schema
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});

// adding encryption plugin for passwords
// userSchema.plugin(encrypt, {
//   secret: process.env.SECRET,
//   encryptedFields: ['password'],
// });

//creating user model
const User = mongoose.model('User', userSchema);

//Routes
app.get('/', (req, res) => {
  res.render('home');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', (req, res) => {
  const newUser = new User({
    email: _.toLower(req.body.username),
    password: md5(req.body.password),
  });

  newUser.save((err) => {
    if (!err) {
      res.render('secrets');
    } else {
      res.send(err);
    }
  });
});

app.post('/login', (req, res) => {
  const email = _.toLower(req.body.username);
  const password = md5(req.body.password);

  User.findOne({ email: email }, (err, foundUser) => {
    if (!err && foundUser) {
      if (foundUser.password === password) {
        res.render('secrets');
      } else {
        res.send('Incorrect password');
      }
    } else {
      res.send('User not found' + err);
    }
  });
});
//run the express
app.listen(3000, () => {
  console.log('Server started on port 3000');
});
