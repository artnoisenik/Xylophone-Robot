var express = require('express');
var router = express.Router();
const valid = require('../validate/');
const knex = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const io = require('../lib/io');


/* GET home page. */
router.get('/', function(req, res, next) {
  console.log("hello");
  res.json('hello');
});
//api/v1/test get request
router.post('/users/signup', valid.register, function(req, res, next) {

  const user = req.body.user;
  const username = user.username;
  const email = user.email;
  const password_hash = bcrypt.hashSync(user.password, 10);

  knex('users')
    .whereRaw('lower(email) = ?', user.email.toLowerCase())
    .count()
    .first()
    .then(function (result) {
      if (result.count == "0") {
        knex('users').insert({email, password_hash})
        .returning('*')
        .then(function(users){
          const regUser = users[0];
          const token = jwt.sign({ id: regUser.id }, process.env.JWT_SECRET )

          res.json({
            id: regUser.id,
            email: email,
            token: token
          })
        })
      } else {
        res.status(422).send({
          error: "Email has already been taken"
        })
      }
    })
});

router.post('/users/login', valid.login, function(req, res, next) {
  const user = req.body.user;
    const email = user.email;
    const password = user.password;
    knex('users')
      .whereRaw('lower(email) = ?', user.email.toLowerCase())
      .first()
      .then(function (result) {
        if (!result) {
          res.status(422).send({
            error: "Invalid password or email"
          })
        }
        else if(!bcrypt.compareSync(password, result.password_hash)) {
            res.status(422).send({ error: 'Invalid password or email' });
        }
        else {
          const token = jwt.sign({ id: result.id }, process.env.JWT_SECRET )

          res.json({
            id: result.id,
            email: email,
            token: token
          })
        }
      })
});

router.get('/songs', function(req, res, next) {
  // var user = jwt.verify(req.body.token, process.env.JWT_SECRET);
  knex('songs')
    .join('users', 'songs.user_id', 'users.id')
    .select('songs.title', 'songs.song', 'songs.user_id')
    .then(function(songs) {
      res.json(songs);
    });
});

router.post('/saveSong', function(req, res, next) {
  var user = jwt.verify(req.body.token, process.env.JWT_SECRET);
  knex('songs')
    .insert({ user_id: user.id, title: req.body.title, song: req.body.song})
    .then(function() {
      res.end();
    });
});

// router.get('/users/logout', function (req, res, next) {
//   localStorage.clear();
// })

module.exports = router;
