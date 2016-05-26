(function() {
    'use strict';

    angular.module('app')
        .directive('bmLoggedin', loggedinDirective);

    function loggedinDirective() {
        return {
            restrict: 'E',
            templateUrl: '/loggedin/loggedin.directive.html',
            controller: controller,
            controllerAs: 'loggedin',
            bindToController: true
        };
    }

    controller.$inject = ['$scope'];

    function controller($scope) {
        var loggedin = this;

    }

})();
