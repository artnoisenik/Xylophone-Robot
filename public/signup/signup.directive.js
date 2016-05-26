(function() {
    'use strict';

    angular.module('app')
        .directive('bmSignup', signupDirective);

    function signupDirective() {
        return {
            restrict: 'E',
            templateUrl: '/signup/signup.directive.html',
            controller: controller,
            controllerAs: 'signup',
            bindToController: true
        };
    }

    controller.$inject = ['BMFactory', '$state'];

    function controller(BMFactory, $state) {
        var signup = this;

        var authType = $state.current.url;
        signup.handleAuth = function() {
            console.log(authType);
            return BMFactory.attemptAuth(authType, signup.user)
                .then(function() {
                    $state.go('loggedin', null, {
                        reload: true
                    });
                });
        };

    }

})();
