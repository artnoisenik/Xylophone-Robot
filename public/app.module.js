(function() {
  'use strict';

  const dependencies = [
    'ui.router',
    'btford.socket-io',
  ];

  angular.module('app', dependencies)
    .config(setupRoutes)
    .run(stateChange)
    .factory('mySocket', mySocket)
    .controller('MainController', MainController);

  setupRoutes.$inject = ['$stateProvider', '$urlRouterProvider', '$locationProvider'];
  function setupRoutes($stateProvider, $urlRouterProvider, $locationProvider){
    $locationProvider.html5Mode(true);
    $urlRouterProvider.otherwise("/");
    $stateProvider
      .state('home', {
        url: "/",
        templateUrl: "/templates/basic_view.html"
      })
      .state('loggedin', {
        url: "/loggedin",
        templateUrl: "/templates/user_view.html"
      })
      .state('signin', {
        url: "/login",
        templateUrl: "/templates/login.html",
        controllerAs: 'auth',
        controller: 'AuthCtrl'
      })
      .state('login', {
        url: "/signup",
        templateUrl: "/templates/signup.html",
        controllerAs: 'auth',
        controller: 'AuthCtrl'
      })
  }

  function stateChange($rootScope, $state, $window) {
    $rootScope.$on('$stateChangeStart', function (event, next, current) {
      // if the next route requires login
      // and we don't have a token
      // then redirect to the homepage
      if (next.requiresLogin && !localStorage.getItem('token')) {
        event.preventDefault();
        $state.go('home');
      }
    });
  }

  mySocket.$inject = ['socketFactory'];
  function mySocket (socketFactory) {
    return socketFactory();
  };

  MainController.$inject = ['$scope', 'mySocket', '$timeout'];
  function MainController ($scope, mySocket, $timeout){
    socket.on('test', function(data){
      $scope.messages = data;
      $scope.$apply();
    })

    socket.emit('messageFeed', {message: 'message'});

    $scope.playNoteC = function() {
      mySocket.emit('noteC:on', 'noteC');
      console.log('NOTE: C ON');
    };

    $scope.playNoteD = function() {
      mySocket.emit('noteD:on');
      console.log('NOTE: D ON');
      $timeout(function() {
        mySocket.emit('noteD:off');
        console.log('NOTE: D OFF');
      }, 50);
    };

    $scope.playNoteE = function() {
      mySocket.emit('noteE:on');
      console.log('NOTE: E ON');
      $timeout(function() {
        mySocket.emit('noteE:off');
        console.log('NOTE: E OFF');
      }, 50);
    };

    $scope.playNoteF = function() {
      mySocket.emit('noteF:on');
      console.log('NOTE: F ON');
      $timeout(function() {
        mySocket.emit('noteF:off');
        console.log('NOTE: F OFF');
      }, 50);
    };

    $scope.playNoteG = function() {
      mySocket.emit('noteG:on');
      console.log('NOTE: G ON');
      $timeout(function() {
        mySocket.emit('noteG:off');
        console.log('NOTE: G OFF');
      }, 50);
    };

    $scope.playNoteA = function() {
      mySocket.emit('noteA:on');
      console.log('NOTE: A ON');
      $timeout(function() {
        mySocket.emit('noteA:off');
        console.log('NOTE: A OFF');
      }, 50);
    };

    $scope.playNoteB = function() {
      mySocket.emit('noteB:on');
      console.log('NOTE: B ON');
      $timeout(function() {
        mySocket.emit('noteB:off');
        console.log('NOTE: B OFF');
      }, 50);
    };

    $scope.playNoteC2 = function() {
      mySocket.emit('noteC2:on');
      console.log('NOTE: C2 ON');
      $timeout(function() {
        mySocket.emit('noteC2:off');
        console.log('NOTE: C2 OFF');
      }, 50);
    };

    $scope.playChordC = function() {
      mySocket.emit('chordC:on');
      console.log('CHORD: C ON');
      $timeout(function() {
        mySocket.emit('chordC:off');
        console.log('CHORD: C OFF');
      }, 50);
    };

  };

}());
