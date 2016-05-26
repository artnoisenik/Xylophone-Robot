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

    controller.$inject = ['$scope', 'BMFactory', '$timeout'];

    function controller($scope, BMFactory, $timeout) {
        var main = this;

        var mySocket = BMFactory.mySocket;

        $scope.playNoteC = function() {
          mySocket.emit('noteC:on');
          console.log('NOTE: C ON');
        };

        $scope.playNoteD = function() {
          mySocket.emit('noteD:on');
          console.log('NOTE: D ON');
        };

        $scope.playNoteE = function() {
          mySocket.emit('noteE:on');
          console.log('NOTE: E ON');
        };

        $scope.playNoteF = function() {
          mySocket.emit('noteF:on');
          console.log('NOTE: F ON');
        };

        $scope.playNoteG = function() {
          mySocket.emit('noteG:on');
          console.log('NOTE: G ON');
        };

        $scope.playNoteA = function() {
          mySocket.emit('noteA:on');
          console.log('NOTE: A ON');
        };

        $scope.playNoteB = function() {
          mySocket.emit('noteB:on');
          console.log('NOTE: B ON');
        };

        $scope.playNoteC2 = function() {
          mySocket.emit('noteC2:on');
          console.log('NOTE: C2 ON');
        };

    }

})();
