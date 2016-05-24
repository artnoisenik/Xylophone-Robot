(function(){

  angular.module('app')
  .service('JWT', JwtService);

  function JwtService($window){
    return {
      save: function(token) {
        $window.localStorage['jwtToken'] = token

      },

      fetch: function() {
        return $window.localStorage['jwtToken']
      },
      destroy: function() {
        $window.localStorage.removeItem('jwtToken')
      }
    }
  }

JwtService.$inject = ['$window']
})()
