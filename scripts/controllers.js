'use strict';

/* Controllers */

angular.module('angularRestfulAuth')
.controller('IndexCtrl', ['$rootScope', '$scope', '$location', '$window', 'Main', function ($rootScope, $scope, $location, $window, Main) {

        $scope.token = $window.sessionStorage.getItem('sessionId');
        if (!$scope.token) {
            $location.path('/signin');
        } else {
            Main.auth(function (res) {
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

        $scope.currentUser = Main.getUser();

        $scope.signin = function () {
            var formData = {
                user: $scope.user,
                password: $scope.password
            }

            Main.signin(formData, function (res) {
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
            Main.logout(function () {
                window.location = "/"
            }, function () {
                alert("Failed to logout!");
            });
        };
    }])
.controller('MapCtrl', ['$rootScope', '$scope', '$location', '$window', 'Map', 'olData', function ($rootScope, $scope, $location, $window, Map, olData) {

    var mapSetts = Map.getMapSetts();
    angular.extend($scope, mapSetts);

    $scope.markers = Map.getMarkers();

    $rootScope.$on('markers:updated', function () {
        $scope.markers = Map.getMarkers();
    });
    
    $scope.showDetails = function (dev) {
        $.each($scope.markers, function( index, value ) {
            if (value.name === dev) {
                $scope.selected = value;
                return false;
            }
        });
        if ($scope.history) {
            $scope.history = $scope.selected;
        }            
    };
    
    $scope.clickEvent = function(obj) {
        var dataValue = obj.target.attributes['data-period'].value;
        var forQuery = Map.getDateRange(new Date, dataValue);
        forQuery.id = $scope.history.id;
        console.log(forQuery);
    };

    $scope.showHistory = function (dev) {
        $scope.hist = true; 
        $.each($scope.markers, function( index, value ) {
            if (value.name === dev) {
                $scope.history = value;
                return false;
            }
        });
        if ($scope.selected) {
            $scope.selected = $scope.history;
        }          
    };

    $scope.$on('$viewContentLoaded', function () {
        $('.input-daterange').datepicker({
            todayBtn: "linked",
            autoclose: true
        });
                
        var resizer = function (e) {
            $('#map, #center').height($(window).height() - $('.navbar-header').height());
            olData.getMap().then(function (map) {
               map.updateSize();
            });
        };
        resizer();
        $(window).bind('resize', resizer);
        });
}])
.controller('MeCtrl', ['$rootScope', '$scope', '$location', 'Main', function($rootScope, $scope, $location, Main) {

        Main.me(function(res) {
            $scope.myDetails = res;
        }, function() {
            $rootScope.error = 'Failed to fetch details';
        })
}]);
