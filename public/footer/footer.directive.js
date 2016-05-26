(function() {
    'use strict';

    angular.module('app')
        .directive('bmFooter', footerDirective);

    function footerDirective() {
        return {
            restrict: 'E',
            templateUrl: '/footer/footer.directive.html',
            controller: controller,
            controllerAs: 'footer',
            bindToController: true
        };
    }

    controller.$inject = ['$scope'];

    function controller($scope) {
        var footer = this;

    }

})();
