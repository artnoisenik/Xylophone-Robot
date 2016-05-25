const five = require("johnny-five");
const board = new five.Board();
const express = require('express');
const app = express();
const httpServer = require("http").createServer(app);
const five = require("johnny-five");
const io = require('socket.io')(httpServer);

const port = 3000;

fiv.Board({
  port: "/dev/cu.usbmodem1411"
})

board.on("ready", function() {
  const led = new five.Led(13);
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
