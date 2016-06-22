'use strict';

angular.module('sledaModule')
    .factory('sledaMain', ['$http', '$window', function($http, $window){
        var baseUrl = "http://85.130.111.122/jwt/service.asmx";
        function changeUser(user) {
            angular.extend(currentUser, user);
        }

        function urlBase64Decode(str) {
            var output = str.replace('-', '+').replace('_', '/');
            switch (output.length % 4) {
                case 0:
                    break;
                case 2:
                    output += '==';
                    break;
                case 3:
                    output += '=';
                    break;
                default:
                    throw 'Illegal base64url string!';
            }
            return window.atob(output);
        }

        function getUserFromToken() {
            var token = window.sessionStorage.getItem('sessionId');
            var user = {};
            if (token) {
                var encoded = token.split('.')[1];
                user = JSON.parse(urlBase64Decode(encoded));
            }
            return user;
        }

        var currentUser = getUserFromToken();

        return {
            save: function(data, success, error) {
                $http.post(baseUrl + '/signin', data).success(success).error(error)
            },
            getUser: getUserFromToken,
            signin: function (data, success, error) {
                $http({
                    method: 'POST',
                    url: baseUrl + '/login',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    transformRequest: function (obj) {
                        return JSON.stringify(obj);
                    },
                    data: data
                }).success(success).error(error);
                //$http.post(baseUrl + '/login', data, {headers: {'Access-Control-Allow-Origin': '*', 'Accept': 'application/json'}}).success(success).error(error)
            },
            auth: function (data, success, error) {
                $http({
                    method: 'POST',
                    url: baseUrl + '/userdetails',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    transformRequest: function (obj) {
                        return JSON.stringify(obj);
                    },
                    data: { token: data }
                }).success(success).error(error);
                //$http.post(baseUrl + '/login', data, {headers: {'Access-Control-Allow-Origin': '*', 'Accept': 'application/json'}}).success(success).error(error)
            },
            me: function(success, error) {
                $http.get(baseUrl + '/me').success(success).error(error)
            },
            logout: function(success) {
                changeUser({});
                $window.sessionStorage.removeItem('sessionId');
                success();
            }
        };
    }]);