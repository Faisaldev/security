require('dotenv').config();
const express = require('express');
const ejs = require('ejs');
const mongoose = require('mongoose');
const _ = require('lodash');
const session = require('express-session');
const passport = require('passport');
const passLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

//init express
const app = express();
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

//init session
app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

//init passport
app.use(passport.initialize());
app.use(passport.session());

//connect db
mongoose.connect(process.env.DB_HOST + 'userDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
});

const db = mongoose.connection;
db.on('error', (err) => {
  if (err) {
    console.log(err);
  }
});
//setup the user schema
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  googleId: String,
});

//Passport local mongoose plugin for hashing and salting
userSchema.plugin(passLocalMongoose);

//adding findorcreate plugin for mongoose
userSchema.plugin(findOrCreate);

//creating user model with schema definition
const User = mongoose.model('User', userSchema);

//adding local strategy for passport
passport.use(User.createStrategy());

//serialize and deserialize user data
passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

//adding google oauth20 strategy for passport
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/google/secrets',
      userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo',
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

//Routes
app.get('/', (req, res) => {
  res.render('home');
});

app.get(
  '/auth/google',
  passport.authenticate('google', { scope: ['profile'] })
);

app.get(
  '/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function (req, res) {
    res.redirect('/secrets');
  }
);

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.get('/secrets', (req, res) => {
  if (req.isAuthenticated()) {
    res.render('secrets');
  } else {
    res.redirect('/login');
  }
});

app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

app.post('/register', (req, res) => {
  User.register(
    { username: _.toLower(req.body.username) },
    req.body.password,
    (err, user) => {
      if (err) {
        console.log(err);
        res.redirect('/register');
      } else {
        passport.authenticate('local')(req, res, () => {
          res.redirect('/secrets');
        });
      }
    }
  );
});

app.post('/login', (req, res) => {
  const user = new User({
    username: _.toLower(req.body.username),
    password: req.body.password,
  });

  req.login(user, (err) => {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate('local')(req, res, () => {
        res.redirect('/secrets');
      });
    }
  });
});

//run the express
app.listen(3000, () => {
  console.log('Server started on port 3000');
});
