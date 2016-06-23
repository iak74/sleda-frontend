'use strict';

/* Controllers */

angular.module('sledaModule')
.controller('LoginController', ['$rootScope', '$scope', '$location', '$window', 'sledaMain', function ($rootScope, $scope, $location, $window, sledaMain) {

        $scope.token = $window.sessionStorage.getItem('sessionId');
        if (!$scope.token) {
            $location.path('/signin');
        } else {
            console.log('logged');
            /* sledaMain.auth($scope.token, function (res) {
                if (res.type == false) {
                    alert(res.data)
                } else {
                    $window.sessionStorage.setItem('sessionId', res.data);
                    $scope.token = true;
                }
            }, function () {
                $rootScope.error = 'Failed to signin';
            });
            */
        }

        //ng-cloak

        $scope.currentUser = sledaMain.getUser();

        $scope.signin = function () {
            var formData = {
                user: $scope.user,
                password: $scope.password
            }

            sledaMain.signin(formData, function (res) {
                if (res.type == false) {
                    alert(res.data)
                    $window.sessionStorage.removeItem('sessionId');
                } else {
                    $window.sessionStorage.setItem('sessionId', res.data);
                }
                window.location = "/";
            }, function (jqXHR, textStatus, errorThrown) {
                console.log(textStatus, errorThrown);
                $rootScope.error = 'Failed to signin';
                $window.sessionStorage.removeItem('sessionId');
                window.location = "/";
            })
        };

        $scope.logout = function () {
            sledaMain.logout(function () {
                window.location = "/"
            }, function () {
                alert("Failed to logout!");
            });
        };
        
        $scope.$on('$viewContentLoaded', function () {
//$scope.$parent.loadScript('lib/ace/ace.js', 'text/javascript', 'utf-8'); 
            $scope.loadScript('js/sleda/CS/constants.js', 'text/javascript', 'utf-8');
        });
       

        $scope.loadScript = function(url, type, charset) {
            if (type===undefined) type = 'text/javascript';
            if (url) {
                var script = document.querySelector("script[src*='"+url+"']");
                if (!script) {
                    var heads = document.getElementsByTagName("head");
                    if (heads && heads.length) {
                        var head = heads[0];
                        if (head) {
                            script = document.createElement('script');
                            script.setAttribute('src', url);
                            script.setAttribute('type', type);
                            if (charset) script.setAttribute('charset', charset);
                            head.appendChild(script);
                        }
                    }
                }
                return script;
            }
        }; 
    }]);