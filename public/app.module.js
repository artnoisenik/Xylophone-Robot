(function() {
  'use strict';

  const dependencies = ['ui.router', 'btford.socket-io'];

  angular.module('app', dependencies)
    .config(setupRoutes)
    .run(stateChange);

  setupRoutes.$inject = ['$stateProvider', '$urlRouterProvider', '$locationProvider'];

  function setupRoutes($stateProvider, $urlRouterProvider, $locationProvider){
    $urlRouterProvider.otherwise('/');

    $stateProvider
      .state('home', {
        url: '/',
        template: '<bm-app></bm-app>'
      })
      .state('loggedin', {
        url: '/loggedin',
        template: '<bm-loggedin></bm-loggedin>'
      })
      .state('signin', {
        url: '/login',
        template: '<bm-login></bm-login>'
      })
      .state('login', {
        url: '/signup',
        template: '<bm-signup></bm-signup>'
      });

    $locationProvider.html5Mode(true);
  }

  function stateChange($rootScope, $state, $window) {
    $rootScope.$on('$stateChangeStart', function (event, next, current) {
      // if the next route requires login
      // and we don't have a token
      // then redirect to the homepage
      if (next.requiresLogin && !localStorage.getItem('jwtToken')) {
        event.preventDefault();
        $state.go('home');
      }
    });
  }

})();
