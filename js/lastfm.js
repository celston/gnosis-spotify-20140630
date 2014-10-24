app.factory('lastfmService', ['$http', '$q', function($http, $q) {
    var api_key = '59d09be6bab770f89ca6eeb33ae2b266';

    function get(method, params) {
        var deferred = $q.defer();

        params['api_key'] = api_key;
        params['format'] = 'json';
        params['method'] = method;

        $http({
            method: 'GET',
            url: 'http://ws.audioscrobbler.com/2.0/',
            params: params
        }).success(function (data) {
           deferred.resolve(data);
        }).error(function (data) {
            deferred.reject();
        });

        return deferred.promise;
    }

    function getByProxy(method, params) {
        var deferred = $q.defer();

        $http({
            method: 'GET',
            url: 'http://findgnosis.com/proxy/lastfm/' + method,
            params: params
        }).success(function (data) {
            deferred.resolve(data);
        }).error(function (data) {
            deferred.reject();
        });

        return deferred.promise;
    }

    var service = {};

    service.trackGetSimilar = function (artist, track) {
        return getByProxy('track.getsimilar', {
            artist: artist,
            track: track
        }).then(
            function (data) {
                if (data.hasOwnProperty('similartracks') && data.similartracks.hasOwnProperty('track') && Array.isArray(data.similartracks.track)) {
                    return data.similartracks.track;
                }

                return [];
            },
            function () {
                return [];
            });
    }

    service.userGetTopTracks = function (user, period, progressCallback) {
        var limit = 200;
        var params = {
            user: user,
            limit: limit
        };
        if (period) {
            params.period = period;
        }

        return get('user.gettoptracks', params).then(
            function (data) {
                if (data.toptracks.hasOwnProperty('@attr')) {
                    var promises = [];
                    var totalPages = data.toptracks['@attr'].totalPages;
                    var progress = 0;

                    for (var page = 1; page <= data.toptracks['@attr'].totalPages; page++) {
                        var params2 = {
                            user: user,
                            page: page,
                            limit: limit
                        };
                        if (period) {
                            params2.period = period;
                        }
                        promises.push(get('user.gettoptracks', params2).then(
                            function (data2) {
                                progress++;
                                if (progressCallback) {
                                    progressCallback(progress / totalPages);
                                }

                                return data2.toptracks.track;
                            }
                        ));
                    }

                    return $q.all(promises).then(function (allTopTracks) {
                        var result = [];

                        angular.forEach(allTopTracks, function (topTracks) {
                            result = result.concat(topTracks);
                        })

                        return result;
                    });
                }
                return;
            },
            function () {
                return;
            }
        )
    }

    service.userGetRecentTracks = function (user) {
        return get('user.getrecenttracks', {
            user: user
        }).then(
            function (data) {
                if (data.hasOwnProperty('recenttracks') && data.recenttracks.hasOwnProperty('track') && data.recenttracks.hasOwnProperty('@attr')) {
                    console.log("check");
                    var result = {
                        data: data.recenttracks.track,
                        attributes: data.recenttracks['@attr']
                    }

                    return result;
                }
                return;
            },
            function () {
                return;
            });
    }

    return service;
}]);