(function () {
  const io = require('socket.io')();
  const knex = require('../db/index');
  const busy = false;

  io.on('connection', function (socket) {
    console.log('connection in io');
    socket.emit('test', 'test')

    io.sockets.emit('test', {testing:"test"});

    socket.on('messageFeed', function(data) {
      console.log(data);
    })

    socket.on('noteC:on', function (data) {
      io.sockets.emit('noteC:on');
      setTimeout(function() {
        io.sockets.emit('noteC:off');
      }, 50);
    });

  });


  module.exports = io;

})();
