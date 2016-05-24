(function() {
  'use strict';

  var dependencies = [
    'ui.router'
  ];

  angular.module('app', dependencies)
    .config(setupRoutes)
    .run(stateChange);

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
        templateUrl: "/templates/login.html"
      })
      .state('login', {
        url: "/signup",
        templateUrl: "/templates/signup.html"
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

}());
