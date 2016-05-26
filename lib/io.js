(function() {
    const io = require('socket.io')();
    const knex = require('../db/index');
    const busy = false;

    io.on('connection', function(socket) {
        console.log('connection in server');

        // CHORDS
        socket.on('chordC', function() {
            io.sockets.emit('chordC');
            console.log('PLAYING NOTE: C IN SERVER');
        });

        socket.on('chordD', function() {
            io.sockets.emit('chordD');
            console.log('PLAYING NOTE: D IN SERVER');
        });

        socket.on('chordE', function() {
            io.sockets.emit('chordE');
            console.log('PLAYING NOTE: E IN SERVER');
        });

        socket.on('chordF', function() {
            io.sockets.emit('chordF');
            console.log('PLAYING NOTE: F IN SERVER');
        });

        socket.on('chordG', function() {
            io.sockets.emit('chordG');
            console.log('PLAYING NOTE: G IN SERVER');
        });

        socket.on('chordA', function() {
            io.sockets.emit('chordA');
            console.log('PLAYING NOTE: A IN SERVER');
        });

        socket.on('chordB', function() {
            io.sockets.emit('chordB');
            console.log('PLAYING NOTE: B IN SERVER');
        });

        socket.on('chordC2', function() {
            io.sockets.emit('chordC2');
            console.log('PLAYING NOTE: C2 IN SERVER');
        });

        // NOTES
        socket.on('noteC', function() {
            io.sockets.emit('noteC');
            console.log('PLAYING NOTE: C IN SERVER');
        });

        socket.on('noteD', function() {
            io.sockets.emit('noteD');
            console.log('PLAYING NOTE: D IN SERVER');
        });

        socket.on('noteE', function() {
            io.sockets.emit('noteE');
            console.log('PLAYING NOTE: E IN SERVER');
        });

        socket.on('noteF', function() {
            io.sockets.emit('noteF');
            console.log('PLAYING NOTE: F IN SERVER');
        });

        socket.on('noteG', function() {
            io.sockets.emit('noteG');
            console.log('PLAYING NOTE: G IN SERVER');
        });

        socket.on('noteA', function() {
            io.sockets.emit('noteA');
            console.log('PLAYING NOTE: A IN SERVER');
        });

        socket.on('noteB', function() {
            io.sockets.emit('noteB');
            console.log('PLAYING NOTE: B IN SERVER');
        });

        socket.on('noteC2', function() {
            io.sockets.emit('noteC2');
            console.log('PLAYING NOTE: C2 IN SERVER');
        });

    });


    module.exports = io;

})();
