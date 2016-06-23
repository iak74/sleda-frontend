'use strict';

angular.module('sledaModule', [
    'ngStorage',
    'ngRoute',
    'angular-loading-bar',
    'openlayers-directive'
])
.directive('script', function($parse, $rootScope, $compile) {
    return {
        restrict: 'E',
        terminal: true,
        link: function(scope, element, attr) {
            if (attr.ngSrc) {
                 var domElem = '<script src="'+attr.ngSrc+'" async defer></script>';
                 $(element).append($compile(domElem)(scope));


            }
        }
    };
});