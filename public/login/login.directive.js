(function() {
    'use strict';

    angular.module('app')
        .directive('bmLogin', loginDirective);

    function loginDirective() {
        return {
            restrict: 'E',
            templateUrl: '/login/login.directive.html',
            controller: controller,
            controllerAs: 'login',
            bindToController: true
        };
    }

    controller.$inject = ['BMFactory', '$state'];

    function controller(BMFactory, $state) {
        var login = this;

        var authType = $state.current.url;
        login.handleAuth = function() {
            console.log(authType);
            return BMFactory.attemptAuth(authType, login.user)
                .then(function() {
                    $state.go('loggedin', null, {
                        reload: true
                    });
                });
        };

    }

})();
