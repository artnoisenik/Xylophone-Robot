(function() {
  'use strict';
  const io = require('socket.io')();
  const knex = require('../db/index');
  const busy = false;
  let stop = false;

  io.on('connection', function(socket) {
    console.log('connection in server');

    socket.on('stop', function () {
      stop = true;
    })

    socket.on('sequence', function (sequence) {
      console.log(sequence);
      let sequenceArr = sequence.seq.split(' ')
      for (let i = 0; i < sequenceArr.length; i++) {
        setTimeout(function () {
          if (stop == false) {
            switch (sequenceArr[i]){
              case '.':
                break;
              case 'C':
                io.sockets.emit('noteC');
                break;
              case 'D':
                io.sockets.emit('noteD');
                break;
              case 'E':
                io.sockets.emit('noteE');
                break;
              case 'F':
                io.sockets.emit('noteF');
                break;
              case 'G':
                io.sockets.emit('noteG');
                break;
              case 'A':
                io.sockets.emit('noteA');
                break;
              case 'B':
                io.sockets.emit('noteB');
                break;
              case 'C2':
                io.sockets.emit('noteC2');
                break;
              case "C'":
                io.sockets.emit('chordC');
                break;
              case "D'":
                io.sockets.emit('chordD');
                break;
              case "E'":
                io.sockets.emit('chordE');
                break;
              case "F'":
                io.sockets.emit('chordF');
                break;
              case "G'":
                io.sockets.emit('chordG');
                break;
              case "A'":
                io.sockets.emit('chordA');
                break;
              case "B'":
                io.sockets.emit('chordB');
                break;
              case "C2'":
                io.sockets.emit('chordC2');
                break;
            }
          } else {
            sequenceArr = [];
          }
        }, i*sequence.bpm);
        stop = false;
      }
    })

  module.exports = io;

})();
