(function() {
  'use strict';

  const dependencies = [
    'ui.router',
  ];

  angular.module('app', dependencies)
    .config(setupRoutes)
    .run(stateChange)
    .controller('MainController', MainController);

  setupRoutes.$inject = ['$stateProvider', '$urlRouterProvider', '$locationProvider'];
  MainController.$inject = ['$scope'];

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

  function MainController ($scope){
    socket.on('test', function(data){
      console.log('test', data);
      $scope.messages = data;
      $scope.$apply();
    })

    socket.emit('messageFeed', {message: 'message'});
  };

}());
