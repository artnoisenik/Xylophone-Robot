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

        main.canSave = true;

        if ($window.localStorage['jwtToken']) {
            main.canSave = false;
        }

        main.isLoggedIn = false;

        if (localStorage.getItem('jwtToken')) {
            main.isLoggedIn = !main.isLoggedIn;
        }

        main.allSongs = [];
        activate();

        function activate() {
            BMFactory.getAllSongs().then(function(res) {
                if (res.status !== 200) {
                    console.log(res);
                } else {
                    console.log(res.data);
                    return main.allSongs = res.data;
                }
            });
        }

        main.logout = function() {
            BMFactory.logOut();
            main.isLoggedIn = !main.isLoggedIn;
        }
        // SAVED SONGS
        main.playSong = function(song) {
          mySocket.emit('song', song.toUpperCase());
          console.log('in directive', song.toUpperCase());
        }

        // SEQUENCE
        main.playSequence = function (sequence) {
          mySocket.emit('sequence', sequence.toUpperCase());
          console.log('in directive', sequence.toUpperCase());
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
