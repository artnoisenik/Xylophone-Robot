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
            if ($window.localStorage['jwtToken']) {
                BMFactory.getUserSongs().then(function(res) {
                    if (res.status !== 200) {
                        console.log(res);
                    } else {
                        return main.userSongs = res.data;
                    }
                });
            }
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

    }

})();
