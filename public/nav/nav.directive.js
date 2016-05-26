(function() {
    'use strict';

    angular.module('app')
        .directive('bmNav', navDirective);

    function navDirective() {
        return {
            restrict: 'E',
            templateUrl: '/nav/nav.directive.html',
            controller: controller,
            controllerAs: 'nav',
            bindToController: true
        };
    }

    controller.$inject = ['$scope'];

    function controller($scope) {
        var nav = this;

    }

})();
