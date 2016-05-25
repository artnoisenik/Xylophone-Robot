'use strict';

const five = require("johnny-five");
const io = require('socket.io')(80);

const led;

//Arduino board connection
let board = new five.Board();
board.on("ready", function() {
    console.log('Arduino connected');
    noteC = new five.Led(2);
    noteD = new five.Led(3);
});

//Socket connection handler
io.on('connection', function(socket) {
    console.log(socket.id);

    socket.on('noteC:on', function(data) {
        noteC.on();
        console.log('PLAYING NOTE: C');
    });

    socket.on('noteC:off', function(data) {
        noteC.off();
        console.log('STOP PLAYING NOTE: C');
    });

    socket.on('noteD:on', function(data) {
        noteD.on();
        console.log('PLAYING NOTE: D');
    });

    socket.on('noteD:off', function(data) {
        noteD.off();
        console.log('STOP PLAYING NOTE: D');
    });

    socket.on('chord:on', function(data) {
        noteC.on();
        noteD.on();
        console.log('PLAYING NOTE: D');
    });

    socket.on('chord:off', function(data) {
        noteC.off();
        noteD.off();
        console.log('STOP PLAYING NOTE: D');
    });
});

console.log('Waiting for connection');
