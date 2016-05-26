var five = require("johnny-five");
var socket = require('socket.io-client')('https://boiling-ravine-61587.herokuapp.com/');

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

socket.on('noteC:on', function(data) {
    noteC.on();
    console.log('PLAYING NOTE: C');
    setTimeout(function() {
        noteC.off();
        console.log('STOP PLAYING NOTE: C');
    }, 20);
});

socket.on('noteD:on', function(data) {
    noteD.on();
    console.log('PLAYING NOTE: D');
    setTimeout(function() {
        noteD.off();
        console.log('STOP PLAYING NOTE: D');
    }, 20);
});

socket.on('noteE:on', function(data) {
    noteE.on();
    console.log('PLAYING NOTE: E');
    setTimeout(function() {
        noteE.off();
        console.log('STOP PLAYING NOTE: E');
    }, 20);
});

socket.on('noteF:on', function(data) {
    noteF.on();
    console.log('PLAYING NOTE: F');
    setTimeout(function() {
        noteF.off();
        console.log('STOP PLAYING NOTE: F');
    }, 20);
});

socket.on('noteG:on', function(data) {
    noteG.on();
    console.log('PLAYING NOTE: G');
    setTimeout(function() {
        noteG.off();
        console.log('STOP PLAYING NOTE: G');
    }, 20);
});

socket.on('noteA:on', function(data) {
    noteA.on();
    console.log('PLAYING NOTE: A');
    setTimeout(function() {
        noteA.off();
        console.log('STOP PLAYING NOTE: A');
    }, 20);
});

socket.on('noteB:on', function(data) {
    noteB.on();
    console.log('PLAYING NOTE: B');
    setTimeout(function() {
        noteB.off();
        console.log('STOP PLAYING NOTE: B');
    }, 20);
});

socket.on('noteC2:on', function(data) {
    noteC2.on();
    console.log('PLAYING NOTE: C2');
    setTimeout(function() {
        noteC2.off();
        console.log('STOP PLAYING NOTE: C2');
    }, 20);
});

socket.on('disconnect', function() {});
