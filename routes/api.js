var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  console.log("hello");
  res.json('hello');
});

module.exports = router;
