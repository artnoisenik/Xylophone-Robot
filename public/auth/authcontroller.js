(function(){
  angular.module('app')
  .controller('AuthCtrl', AuthCtrl);
  function AuthCtrl(UserService, $state){
    var vm = this;
    var authType = $state.current.url;
    vm.handleAuth = function(){
      console.log(authType);
    return  UserService.attemptAuth(authType, vm.user)
    .then(function(response) {
      if(response.error){
        vm.error = response.error;
        $state.go('login')
      }else {
        $state.go('loggedin', null, { reload: true })
      }
    })

    }



  }
})()
