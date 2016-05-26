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

    controller.$inject = ['BMFactory', '$state', '$scope'];

    function controller(BMFactory, $state, $scope) {
        var signup = this;

        var authType = $state.current.url;
        signup.handleAuth = function() {
            console.log(authType);
            return BMFactory.attemptAuth(authType, signup.user)
                .then(function() {
                    console.log($scope);
                    $state.go('home', null, {
                        reload: true
                    });
                });
        };

    }

})();
