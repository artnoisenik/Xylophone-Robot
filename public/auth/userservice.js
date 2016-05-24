(function() {
  angular.module('app')
  .service('UserService', UserService);

  function UserService($http, JWT, $window) {
    var self = this;

    self.currentUser = null;


      self.attemptAuth = function(authType, user) {
        return $http.post('/api/v1/users' + authType, {user})
        .then(function(response){
          JWT.save(response.data.token)
          self.currentUser = response.data.id;

          return response;
        })
        .catch(function(error){
          console.log(error.data.error);
        })
      };


      self.logOut = function() {
        self.currentUser = null;
        jwt.destroy();
        $window.location.reload;
      }
  }

  UserService.$inject= ['$http', 'JWT']
})()
