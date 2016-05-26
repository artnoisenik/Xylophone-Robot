(function() {
    'use strict';

    angular.module('app')
        .factory('BMFactory', BMFactory);


    BMFactory.$inject = ['$http', '$window'];

    function BMFactory($http, $window) {
        var currentUser = null;

        var service = {
            attemptAuth,
            logOut,
            save,
            fetch,
            destroy
        };

        return service;

        function attemptAuth(authType, user) {
            return $http.post('/api/v1/users' + authType, {user: user})
                .then(function(response) {
                    console.log('factory', response);
                    save(response.data.token);
                    currentUser = response.data.id;

                    return response;
                })
                .catch(function(error) {
                    console.log(error.data.error);
                });
        }

        function logOut() {
            currentUser = null;
            destroy();
            $window.location.reload;
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
