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

    controller.$inject = ['$scope'];

    function controller($scope) {
        var main = this;

    }

})();
