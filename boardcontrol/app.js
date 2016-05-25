'use strict';

var express = require('express');
var app = express();
var httpServer = require("http").createServer(app);
var five = require("johnny-five");
var io = require('socket.io')(httpServer);

var port = 3000;

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/public/index.html');
});

httpServer.listen(port);
console.log('Server available at http://localhost:' + port);
var led;

//Arduino board connection

var board = new five.Board();
board.on("ready", function() {
    console.log('Arduino connected');
    noteC = new five.Led(2);
    noteD = new five.Led(3);
    noteE = new five.Led(4);
    noteF = new five.Led(5);
    noteG = new five.Led(6);
    noteA = new five.Led(7);
    noteB = new five.Led(8);
    noteC2 = new five.Led(9);
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

    socket.on('noteE:on', function(data) {
        noteE.on();
        console.log('PLAYING NOTE: E');
    });

    socket.on('noteE:off', function(data) {
        noteE.off();
        console.log('STOP PLAYING NOTE: E');
    });

    socket.on('noteF:on', function(data) {
        noteF.on();
        console.log('PLAYING NOTE: F');
    });

    socket.on('noteF:off', function(data) {
        noteF.off();
        console.log('STOP PLAYING NOTE: F');
    });

    socket.on('noteG:on', function(data) {
        noteG.on();
        console.log('PLAYING NOTE: G');
    });

    socket.on('noteG:off', function(data) {
        noteG.off();
        console.log('STOP PLAYING NOTE: G');
    });

    socket.on('noteA:on', function(data) {
        noteA.on();
        console.log('PLAYING NOTE: A');
    });

    socket.on('noteA:off', function(data) {
        noteA.off();
        console.log('STOP PLAYING NOTE: A');
    });

    socket.on('noteB:on', function(data) {
        noteB.on();
        console.log('PLAYING NOTE: B');
    });

    socket.on('noteB:off', function(data) {
        noteB.off();
        console.log('STOP PLAYING NOTE: B');
    });

    socket.on('noteC2:on', function(data) {
        noteC2.on();
        console.log('PLAYING NOTE: C2');
    });

    socket.on('noteC2:off', function(data) {
        noteC2.off();
        console.log('STOP PLAYING NOTE: C2');
    });

});
