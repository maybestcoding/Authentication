//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const app = express();
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const fineOrCreate = require("mongoose-findorcreate");



app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended:true
}));

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false

}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/authenticateDb");
const userSchema =new mongoose.Schema({
  email:String,
  password:String,
  googleId:String,
  facebookId:String,
  secret:String
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(fineOrCreate);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/Secret22"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secret22"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
  res.render("home");
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ['profile'] }));

app.get("/auth/google/Secret22",
    passport.authenticate('google', { failureRedirect: "/login" }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect("/secrets");
    });

app.get('/auth/facebook',
      passport.authenticate('facebook'));

app.get('/auth/facebook/secret22',
      passport.authenticate('facebook', { failureRedirect: '/login' }),
      function(req, res) {
        // Successful authentication, redirect home.
        res.redirect('/secrets');
      });

app.get("/login", function(req, res){
  res.render("login");
});
app.get("/register", function(req, res){
  res.render("register");
});
app.get("/secrets", function(req, res){
  User.find({"secret":{$ne:null}}, function(err, foundUser){
    if(err){
      console.log(err);
    } else {
      if(foundUser){
        res.render("secrets", {userWithSecrets: foundUser})
      }
    }
  });
});
app.get("/logout", function(req, res){
  req.logout(function(err){
    if(err){
      console.log(err);
    } else{
      res.redirect("/");
    }
  })

});
app.get("/submit", function(req, res){
  if(req.isAuthenticated()) {
    res.render("submit")
  } else{
    res.redirect("/login")
  }
});
app.post("/register", function(req, res){
  User.register({username:req.body.username}, req.body.password, function(err, user) {
    if (err) {
    console.log(err);
    res.redirect("/register")
  } else {
    passport.authenticate("local")(req, res, function(){
      res.redirect("/secrets")
    })

  }
});
});

app.post("/login", function(req, res){
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  req.login(user, function(err){
    if(err){
      console.log(err);

    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets")
    })
  }
  })

});
app.post("/submit", function(req, res){
  const submitSecret = req.body.secret;

  User.findById(req.user._id.toString(), function(err, foundUser){
     if(err){
       console.log(err);
    } else{
     if(foundUser){
       foundUser.secret = submitSecret;
        foundUser.save(function(){
          res.redirect("/secrets");
        })
      }
   }
   })
})

app.listen(3000, function(){
  console.log("Server started on port 3000");
});
