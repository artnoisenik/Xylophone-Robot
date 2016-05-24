var five = require("johnny-five");
var board = new five.Board();
var express = require('express');
var app = express();
var httpServer = require("http").createServer(app);
var five = require("johnny-five");
var io = require('socket.io')(httpServer);

var port = 3000;

fiv.Board({
  port: "/dev/cu.usbmodem1411"
})

board.on("ready", function() {
  var led = new five.Led(13);
  led.blink(500);
});

io.on('connection', function (socket) {
  console.log(socket.id);

  socket.on('led:on', function (data) {
    led.on();
    console.log('LED ON RECEIVED');
  });

  socket.on('led:off', function (data) {
    led.off();
    console.log('LED OFF RECEIVED');

  });
});
