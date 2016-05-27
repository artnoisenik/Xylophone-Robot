(function() {
    'use strict';

    angular.module('app')
        .directive('bmMain', mainDirective);

    function mainDirective() {
        return {
            restrict: 'E',
            templateUrl: '/main/main.directive.html',
            controller: controller,
            controllerAs: 'main',
            bindToController: true
        };
    }

    controller.$inject = ['$scope', 'BMFactory', '$timeout', '$window'];

    function controller($scope, BMFactory, $timeout, $window) {
        var main = this;
        var mySocket = BMFactory.mySocket;

        main.showUserSongs = false;

        main.bpm = {
            value: 120,
            options: {
                floor: 60,
                ceil: 300,
                step: 10,
                getPointerColor: function(value) {
                    return '#e600e6';
                },
            },
        };

        main.canSave = true;

        if ($window.localStorage['jwtToken']) {
            main.canSave = !main.canSave;
            main.showUserSongs = !main.showUserSongs;
        }

        main.isLoggedIn = false;

        if (localStorage.getItem('jwtToken')) {
            main.isLoggedIn = !main.isLoggedIn;
        }

        main.allSongs = [];
        main.userSongs = [];
        activate();

        function activate() {
            BMFactory.getAllSongs().then(function(res) {
                if (res.status !== 200) {
                    console.log(res);
                } else {
                    return main.allSongs = res.data;
                }
            });
            BMFactory.getUserSongs().then(function(res) {
                if (res.status !== 200) {
                    console.log(res);
                } else {
                    return main.userSongs = res.data;
                }
            });
        }

        main.deleteSong = function(songId) {
            BMFactory.deleteUserSong(songId).then(function(res) {
                if (res.status !== 200) {
                    console.log(res);
                } else {
                    activate();
                }
            });
        }

        main.logout = function() {
            BMFactory.logOut();
            main.isLoggedIn = !main.isLoggedIn;
            main.canSave = !main.canSave;
            main.showUserSongs = !main.showUserSongs;
        }

        main.playSong = function(song) {
            mySocket.emit('song', song.toUpperCase());
            console.log('in directive', song.toUpperCase());
        }

        // SEQUENCE
        main.playSequence = function(sequence) {
            let bpm = 60000 / main.bpm.value;
            let seq = sequence.toUpperCase();
            mySocket.emit('sequence', {
                seq,
                bpm
            });
            console.log('in directive', sequence.toUpperCase());
            console.log('in directive bpm', main.bpm.value);
        }

        main.saveSequence = function(song) {
            BMFactory.saveSong(song).then(function(res) {
                if (res.status !== 200) {
                    console.log(res);
                } else {
                    activate();
                    main.sequence = {};
                }
            });
        }

        // CHORDS
        $scope.playChordC = function() {
            mySocket.emit('chordC');
            console.log('PLAYING CHORD C IN CLIENT');
        };

        $scope.playChordD = function() {
            mySocket.emit('chordD');
            console.log('PLAYING CHORD D IN CLIENT');
        };

        $scope.playChordE = function() {
            mySocket.emit('chordE');
            console.log('PLAYING CHORD E IN CLIENT');
        };

        $scope.playChordF = function() {
            mySocket.emit('chordF');
            console.log('PLAYING CHORD F IN CLIENT');
        };

        $scope.playChordG = function() {
            mySocket.emit('chordG');
            console.log('PLAYING CHORD G IN CLIENT');
        };

        $scope.playChordA = function() {
            mySocket.emit('chordA');
            console.log('PLAYING CHORD A IN CLIENT');
        };

        $scope.playChordB = function() {
            mySocket.emit('chordB');
            console.log('PLAYING CHORD B IN CLIENT');
        };

        $scope.playChordC2 = function() {
            mySocket.emit('chordC2');
            console.log('PLAYING CHORD C2 IN CLIENT');
        };

        // NOTES
        $scope.playNoteC = function() {
            mySocket.emit('noteC');
            console.log('PLAYING NOTE C IN CLIENT');
        };

        $scope.playNoteD = function() {
            mySocket.emit('noteD');
            console.log('PLAYING NOTE D IN CLIENT');
        };

        $scope.playNoteE = function() {
            mySocket.emit('noteE');
            console.log('PLAYING NOTE E IN CLIENT');
        };

        $scope.playNoteF = function() {
            mySocket.emit('noteF');
            console.log('PLAYING NOTE F IN CLIENT');
        };

        $scope.playNoteG = function() {
            mySocket.emit('noteG');
            console.log('PLAYING NOTE G IN CLIENT');
        };

        $scope.playNoteA = function() {
            mySocket.emit('noteA');
            console.log('PLAYING NOTE A IN CLIENT');
        };

        $scope.playNoteB = function() {
            mySocket.emit('noteB');
            console.log('PLAYING NOTE B IN CLIENT');
        };

        $scope.playNoteC2 = function() {
            mySocket.emit('noteC2');
            console.log('PLAYING NOTE C2 IN CLIENT');
        };

    }

})();
