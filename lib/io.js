(function() {
    const io = require('socket.io')();
    const knex = require('../db/index');
    const busy = false;

    io.on('connection', function(socket) {
        console.log('connection in io');

        socket.on('noteC:on', function() {
            io.sockets.emit('noteC:on');
            console.log('PLAYING NOTE: C');
            setTimeout(function() {
                io.sockets.emit('noteC:off');
                console.log('STOP PLAYING NOTE: C');
            }, 20);
        });

        socket.on('noteD:on', function() {
            io.sockets.emit('noteD:on');
            console.log('PLAYING NOTE: D');
            setTimeout(function() {
                io.sockets.emit('noteD:off');
                console.log('STOP PLAYING NOTE: D');
            }, 20);
        });

        socket.on('noteE:on', function() {
            io.sockets.emit('noteE:on');
            console.log('PLAYING NOTE: E');
            setTimeout(function() {
                io.sockets.emit('noteE:off');
                console.log('STOP PLAYING NOTE: E');
            }, 20);
        });

        socket.on('noteF:on', function() {
            io.sockets.emit('noteF:on');
            console.log('PLAYING NOTE: F');
            setTimeout(function() {
                io.sockets.emit('noteF:off');
                console.log('STOP PLAYING NOTE: F');
            }, 20);
        });

        socket.on('noteG:on', function() {
            io.sockets.emit('noteG:on');
            console.log('PLAYING NOTE: G');
            setTimeout(function() {
                io.sockets.emit('noteG:off');
                console.log('STOP PLAYING NOTE: G');
            }, 20);
        });

        socket.on('noteA:on', function() {
            io.sockets.emit('noteA:on');
            console.log('PLAYING NOTE: A');
            setTimeout(function() {
                io.sockets.emit('noteA:off');
                console.log('STOP PLAYING NOTE: A');
            }, 20);
        });

        socket.on('noteB:on', function() {
            io.sockets.emit('noteB:on');
            console.log('PLAYING NOTE: B');
            setTimeout(function() {
                io.sockets.emit('noteB:off');
                console.log('STOP PLAYING NOTE: B');
            }, 20);
        });

        socket.on('noteC2:on', function() {
            io.sockets.emit('noteC2:on');
            console.log('PLAYING NOTE: C2');
            setTimeout(function() {
                io.sockets.emit('noteC2:off');
                console.log('STOP PLAYING NOTE: C2');
            }, 20);
        });

    });


    module.exports = io;

})();
