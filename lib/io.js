(function () {
  const io = require('socket.io')();
  const knex = require('../db/index');
  const busy = false;

  io.on('connection', function (socket) {
    console.log('connection in io');
    socket.emit('event', 'event')

    io.sockets.emit('test', {testing:"test"});

    socket.on('messageFeed', function(data) {
      console.log(data);
    })

  });


  module.exports = io;

})();
