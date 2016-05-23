var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  console.log("hello");
  res.json('hello');
});
//api/v1/test get request
router.get('/test', function(req, res, next) {
  console.log("test");
  res.json('test');
});

module.exports = router;
