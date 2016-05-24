var io = require('socket.io')();
var knex = require('../db/index');
var busy = false;

io.on('connection', function (socket) {

  io.sockets.emit('test', {testing:"test"});

  socket.on('messageFeed', function(data) {
      console.log(data);
  })

});

module.exports = io;
