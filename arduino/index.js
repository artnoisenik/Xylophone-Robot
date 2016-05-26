// require('dotenv').config();

var five = require("johnny-five");
var socket = require('socket.io-client')(process.env.DEPLOYED_URL || 'http://localhost:3000');

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

// CHORDS
socket.on('chordC', function(data) {
    noteC.on();
    noteE.on();
    console.log('PLAYING CHORD: C IN HOST');
    setTimeout(function() {
        noteC.off();
        noteE.off();
        console.log('STOP PLAYING CHORD: C IN HOST');
    }, 20);
});

socket.on('chordD', function(data) {
    noteD.on();
    noteF.on();
    console.log('PLAYING CHORD: D IN HOST');
    setTimeout(function() {
        noteD.off();
        noteF.off();
        console.log('STOP PLAYING CHORD: D IN HOST');
    }, 20);
});

socket.on('chordE', function(data) {
    noteE.on();
    noteG.on();
    console.log('PLAYING CHORD: E IN HOST');
    setTimeout(function() {
        noteE.off();
        noteG.off();
        console.log('STOP PLAYING CHORD: E IN HOST');
    }, 20);
});

socket.on('chordF', function(data) {
    noteF.on();
    noteA.on();
    console.log('PLAYING CHORD: F IN HOST');
    setTimeout(function() {
        noteF.off();
        noteA.off();
        console.log('STOP PLAYING CHORD: F IN HOST');
    }, 20);
});

socket.on('chordG', function(data) {
    noteG.on();
    noteB.on();
    console.log('PLAYING CHORD: G IN HOST');
    setTimeout(function() {
        noteG.off();
        noteB.off();
        console.log('STOP PLAYING CHORD: G IN HOST');
    }, 20);
});

socket.on('chordA', function(data) {
    noteA.on();
    noteC2.on();
    console.log('PLAYING CHORD: A IN HOST');
    setTimeout(function() {
        noteA.off();
        noteC2.off();
        console.log('STOP PLAYING CHORD: A IN HOST');
    }, 20);
});

socket.on('chordB', function(data) {
    noteB.on();
    noteG.on();
    console.log('PLAYING CHORD: B IN HOST');
    setTimeout(function() {
        noteB.off();
        noteG.off();
        console.log('STOP PLAYING CHORD: B IN HOST');
    }, 20);
});

socket.on('chordC2', function(data) {
    noteC2.on();
    noteC.on();
    console.log('PLAYING CHORD: C2 IN HOST');
    setTimeout(function() {
        noteC2.off();
        noteC.off();
        console.log('STOP PLAYING CHORD: C2 IN HOST');
    }, 20);
});

// NOTES
socket.on('noteC', function(data) {
    noteC.on();
    console.log('PLAYING NOTE: C IN HOST');
    setTimeout(function() {
        noteC.off();
        console.log('STOP PLAYING NOTE: C IN HOST');
    }, 20);
});

socket.on('noteD', function(data) {
    noteD.on();
    console.log('PLAYING NOTE: D IN HOST');
    setTimeout(function() {
        noteD.off();
        console.log('STOP PLAYING NOTE: D IN HOST');
    }, 20);
});

socket.on('noteE', function(data) {
    noteE.on();
    console.log('PLAYING NOTE: E IN HOST');
    setTimeout(function() {
        noteE.off();
        console.log('STOP PLAYING NOTE: E IN HOST');
    }, 20);
});

socket.on('noteF', function(data) {
    noteF.on();
    console.log('PLAYING NOTE: F IN HOST');
    setTimeout(function() {
        noteF.off();
        console.log('STOP PLAYING NOTE: F IN HOST');
    }, 20);
});

socket.on('noteG', function(data) {
    noteG.on();
    console.log('PLAYING NOTE: G IN HOST');
    setTimeout(function() {
        noteG.off();
        console.log('STOP PLAYING NOTE: G IN HOST');
    }, 20);
});

socket.on('noteA', function(data) {
    noteA.on();
    console.log('PLAYING NOTE: A IN HOST');
    setTimeout(function() {
        noteA.off();
        console.log('STOP PLAYING NOTE: A IN HOST');
    }, 20);
});

socket.on('noteB', function(data) {
    noteB.on();
    console.log('PLAYING NOTE: B IN HOST');
    setTimeout(function() {
        noteB.off();
        console.log('STOP PLAYING NOTE: B IN HOST');
    }, 20);
});

socket.on('noteC2', function(data) {
    noteC2.on();
    console.log('PLAYING NOTE: C2 IN HOST');
    setTimeout(function() {
        noteC2.off();
        console.log('STOP PLAYING NOTE: C2 IN HOST');
    }, 20);
});

socket.on('disconnect', function() {});
