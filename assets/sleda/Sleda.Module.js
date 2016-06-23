'use strict';

angular.module('sledaModule', [
    'ngStorage',
    'ngRoute',
    'angular-loading-bar',
    'openlayers-directive'
])
.config(['$routeProvider', '$httpProvider', function ($routeProvider, $httpProvider) {

    $routeProvider.
        when('/', {
            controller: 'MapCtrl',
            templateUrl: 'resources/partials/home.html'
        }).
        when('/signin', {
            templateUrl: 'resources/partials/signin.html',
            controller: 'LoginController'
        }).
        when('/signup', {
            templateUrl: 'resources/partials/signup.html',
            controller: 'LoginController'
        }).
        when('/me', {
            templateUrl: 'resources/partials/me.html',
            controller: 'LoginController'
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
                        //config.headers.Authorization = token;
                        //config.headers['Access-Control-Allow-Origin'] = '*';
                        //config.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,HEAD,DELETE,OPTIONS';
                        //config.headers['Access-Control-Allow-Headers'] = 'content-Type,x-requested-with,authorization,accept';

                        //config.headers.Authorization = token;
                        //config.method = 'POST';
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