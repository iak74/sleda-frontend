'use strict';

angular.module('angularRestfulAuth', [
    'ngStorage',
    'ngRoute',
    'angular-loading-bar',
    'openlayers-directive'
])
.config(['$routeProvider', '$httpProvider', function ($routeProvider, $httpProvider) {

    $routeProvider.
        when('/', {
            controller: 'MapCtrl',
            templateUrl: 'partials/home.html'
        }).
        when('/signin', {
            templateUrl: 'partials/signin.html',
            controller: 'IndexCtrl'
        }).
        when('/signup', {
            templateUrl: 'partials/signup.html',
            controller: 'IndexCtrl'
        }).
        when('/me', {
            templateUrl: 'partials/me.html',
            controller: 'IndexCtrl'
        }).
        otherwise({
            redirectTo: '/signin'
        });

    $httpProvider.interceptors.push(['$q', '$location', '$window', function($q, $location, $window) {
            return {
                'request': function (config) {
                    config.headers = config.headers || {};
                    var token = $window.sessionStorage.getItem('sessionId');
                    if (token) {
                        config.headers.Authorization = 'Bearer ' + token;
                    } else if ($location.path() !== '/signin') {
                        $window.sessionStorage.removeItem('sessionId');
                        $location.path('/signin');
                    }
                    return config;
                },
                'responseError': function(response) {
                    if (response.status === 401 || response.status === 403) {
                        $window.sessionStorage.removeItem('sessionId');
                        $location.path('/signin');
                    }
                    return $q.reject(response);
                }
            };
        }]);

    }
]);