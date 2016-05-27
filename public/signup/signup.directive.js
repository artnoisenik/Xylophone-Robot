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
                .then(function(response) {

                  if(response.error){
                    signup.error = response.error;
                    console.log(signup.error);
                  }else {
                    $state.go('home', null, { reload: true })
                  }
                });
        };

    }

})();
