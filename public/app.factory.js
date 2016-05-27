(function() {
    'use strict';

    angular.module('app')
        .factory('BMFactory', BMFactory);


    BMFactory.$inject = ['$http', '$window', 'socketFactory', '$state'];

    function BMFactory($http, $window, socketFactory, $state) {
        var currentUser = null;

        var service = {
            attemptAuth,
            logOut,
            save,
            fetch,
            destroy,
            saveSong,
            mySocket: socketFactory(),
        };

        return service;

        function attemptAuth(authType, user) {
            return $http.post('/api/v1/users' + authType, {user: user})
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
            console.log(song);
            return $http.post('/api/v1/saveSong', {'song': song} )
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
