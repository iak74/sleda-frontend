'use strict';

/* Controllers */

angular.module('sledaModule')
.controller('LoginController', ['$rootScope', '$scope', '$location', '$window', 'sledaMain', function ($rootScope, $scope, $location, $window, sledaMain) {

        $scope.token = $window.sessionStorage.getItem('sessionId');
        if (!$scope.token) {
            $location.path('/signin');
        } else {
            sledaMain.auth($scope.token, function (res) {
                if (res.type == false) {
                    alert(res.data)
                } else {
                    $window.sessionStorage.setItem('sessionId', res.data);
                    $scope.token = true;
                }
            }, function () {
                $rootScope.error = 'Failed to signin';
            });
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
    }]);