(function() {
    'use strict';

    angular.module('app')
        .directive('bmApp', appDirective);

    function appDirective() {
        return {
            restrict: 'E',
            templateUrl: '/layout/layout.directive.html',
            controller: controller,
            controllerAs: 'vm',
            bindToController: true
        };
    }

    controller.$inject = [];

    function controller() {
        var vm = this;

    }

})();
