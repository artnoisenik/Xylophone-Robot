(function() {
    'use strict';

    angular.module('app')
        .factory('BMFactory', BMFactory);

    BMFactory.$inject = ['$http', '$window', 'socketFactory', '$state'];

    function BMFactory($http, $window, socketFactory, $state) {
        var currentUser = null;

        var service = {
            getAllSongs,
            attemptAuth,
            logOut,
            save,
            fetch,
            destroy,
            saveSong,
            mySocket: socketFactory(),
        };

        return service;

        function getAllSongs() {
            return $http.get('/api/v1/songs')
                .then(function(res) {
                    return res;
                })
                .catch(function(err) {
                    return err;
                });
        }

        function attemptAuth(authType, user) {
            return $http.post('/api/v1/users' + authType, {
                    user: user
                })
                .then(function(response) {
                    save(response.data.token);
                    currentUser = response.data.id;

                    return response;
                })
                .catch(function(error) {
                    return error.data;
                });
        }

        function logOut() {
            currentUser = null;
            destroy();
            $state.go('home');
        }

        function saveSong(song) {
            return $http.post('/api/v1/saveSong', {
                    'title': song.songTitle,
                    'song': song.song,
                    'token': $window.localStorage['jwtToken']
                })
                .then(function(response) {
                    return response;
                })
                .catch(function(error) {
                    return error.data;
                });
        }

        function save(token) {
            $window.localStorage['jwtToken'] = token;
        }

        function fetch() {
            return $window.localStorage['jwtToken'];
        }

        function destroy() {
            $window.localStorage.removeItem('jwtToken');
        }

    }

})();
