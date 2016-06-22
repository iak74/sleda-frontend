'use strict';

angular.module('angularRestfulAuth')
    .factory('Main', ['$http', '$window', function($http, $window){
        var baseUrl = "http://85.130.111.122:8090/service/service.asmx";
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
            signin: function(data, success, error) {
                $http.post(baseUrl + '/Login', data).success(success).error(error)
            },
            auth: function(success, error) {
                $http.post(baseUrl + '/auth').success(success).error(error)
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
    }])
    .factory('Map', ['$http', '$window', '$rootScope', function ($http, $window, $rootScope) {
        var baseUrl = "http://ivan-galina.info:3001";

        var markers = [];
        
        var parseDate = function (date) {
            function zeroPad(d) {
                return ("0" + d).slice(-2)
            }
            
            var parsed = new Date(date);

            return parsed.getUTCFullYear() + '-' + zeroPad(parsed.getMonth() + 1) + '-' + zeroPad(parsed.getDate()) + ' ' + zeroPad(parsed.getHours()) + ':' + zeroPad(parsed.getMinutes()) + ':' + zeroPad(parsed.getSeconds());
        };
        
        var prepareDateRange = function (date, interval) {

            var parsed = new Date( date );        
            var parsed2 = new Date ( parsed );
            parsed2.setHours ( parsed.getHours() - interval );
            
            var dates = {
                dateStart: parseDate(parsed),
                dateEnd: parseDate(parsed2)
            }
            
            return dates;
        };

        var mapSetts = {
            center: {
                zoom: 9,
                lat: 43.0,
                lon:23.0,
                autodiscover: true
            },
            layers: [
                {
                    name: 'Here',
                    active: true,
                    opacity: 1.0,
                    source: {
                        type: "OSM",
                        url: "http://a.maptile.maps.svc.ovi.com/maptiler/maptile/newest/normal.day/{z}/{x}/{y}/256/png8?lg=...&token=...",
                        attribution: '&copy; 2013 Nokia...'
                    }
                },
                {
                    name: 'TopoJSON',
                    active: false,
                    source: {
                        type: 'TopoJSON',
                        url: 'json/world.topo.json'
                    },
                    style: {
                        fill: {
                            color: 'rgba(255, 0, 0, 0.6)'
                        },
                        stroke: {
                            color: 'white',
                            width: 3
                        }
                    }
                }
            ],
            defaults: {
                interactions: {
                    mouseWheelZoom: true
                },
                controls: {
                    zoom: true,
                    rotate: true,
                    attribution: true,
                    scaleline: true
                }
            }
        };

        var getDevs = function (success, error) {
            $http.get(baseUrl + '/devices')
                .success(function (res) {
                    if (res.type == false) {
                        alert(res.data)
                    } else {
                        markers = [];
                        var features = (new ol.format.GeoJSON()).readFeatures(res.data, { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' });
                        for (var feature in features) {
                            var props1 = features[feature].get('f1');
                            var props2 = features[feature].get('f2');
                            var props3 = features[feature].get('f3');
                            var props4 = features[feature].get('f4');
                            markers.push({
                                "id": props1,
                                "name": props2,
                                "descr": props3,
                                "dev": props4.dev,
                                "time": props4.dt,
                                "speed": props4.speed,
                                "dir": props4.dir,
                                "volt": props4.volt,
                                "lat": props4.lat,
                                "lon": props4.lon,
                                "alt": 0,
                                "show": true,
                                "label": {
                                    "message": props2,
                                    "show": false,
                                    "showOnMouseOver": true
                                }
                            });
                        }
                        $rootScope.$broadcast('markers:updated');
                    }
                })
                .error(function () {

                });
        };

        //setInterval(getDevs, 10000);

        return {
            getMarkers: function () {
                if (markers.length === 0) {
                    getDevs();
                } 
                return markers;
            },
            getMapSetts: function() {
                return mapSetts;
            },
            getDateRange: prepareDateRange
        };
    }])