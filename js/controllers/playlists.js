app.controller('PlaylistsController', ['$scope', '$http', '$q', '$timeout', 'spotifyApiService', function ($scope, $http, $q, $timeout, spotifyApi) {
    spotifyApi.getCurrentUserPlaylists().then(function (playlists) {
        $scope.currentPlaylists = playlists;
    })

    $scope.queue = [];
    $scope.sourceTracks = null;
    $scope.candidateTracks = null;
    $scope.userTracks = {};
    $scope.recommendedTracks = null;
    $scope.rebuilding = false;
    $scope.candidateTracksLoaded = 20;

    $scope.foo = function() {
        $scope.candidateTracksLoaded++;
    }


    function processNextTrack() {
        if ($scope.queue.length > 0) {
            var nextTrack = $scope.queue.pop();
            processTrack(nextTrack);
        }
        else {
            rebuildRecommendedTracks();
        }
    }

    function rebuildRecommendedTracks() {
        if (!$scope.rebuilding) {
            $scope.recommendedTracks = [];
            $scope.rebuilding = true;

            angular.forEach($scope.candidateTracks, function (candidateTrack) {
                if (candidateTrack.artist in $scope.userTracks) {
                    angular.forEach($scope.userTracks[candidateTrack.artist], function (userTrack) {
                        if (candidateTrack.name == userTrack.name) {
                            console.log(candidateTrack);
                            console.log(userTrack);

                            $scope.recommendedTracks.push({
                                artist: candidateTrack.artist,
                                name: candidateTrack.name,
                                score: candidateTrack.score * userTrack.playcount
                            })
                        }
                    });
                }
                else {
                    console.log(candidateTrack.artist);
                }
            })

            $scope.rebuilding = false;
        }
    }

    $scope.submit = function() {
        $scope.sourceTracks = [];
        $scope.candidateTracks = [];
        $scope.candidateTracksLoading = true;
        $scope.candidateTracksLoaded = 0;

        spotifyApi.getPlaylistTracks($scope.selectedPlaylist).then(function (tracks) {
            $scope.queue = tracks;
            $scope.sourceTracks = [];

            angular.forEach(tracks, function (track) {
                $scope.sourceTracks.push({
                    artist: track.artists[0].name,
                    name: track.name
                });
            })

            var promises = [];
            $scope.candidateTracksLoading = true;
            $scope.candidateTracksLoaded = 0;
            $timeout(function () {
                $scope.candidateTracksToBeLoaded = $scope.sourceTracks.length;
            }, 0);

            angular.forEach($scope.sourceTracks, function (sourceTrack) {
                var deferred = $q.defer();
                deferred.promise.then(function () {
                    $scope.candidateTracksLoaded++;
                })

                $http({
                    url: 'http://findgnosis.com/proxy/lastfm/track_getsimilar',
                    method: 'GET',
                    params: {
                        artist: sourceTrack.artist,
                        track: sourceTrack.name,
                        limit: 10
                    }
                }).success(function (data) {
                    deferred.resolve(data);
                }).error(function (data) {
                    deferred.resolve(null);
                });

                promises.push(deferred.promise);
            })

            $q.all(promises).then(function (allData) {
                $scope.candidateTracks = [];
                $scope.candidateTracksLoading = false;

                angular.forEach(allData, function (data) {
                    if (data == null) {
                        return;
                    }

                    var list = [];

                    if ('similartracks' in data) {
                        if ('track' in data.similartracks) {
                            if (Array.isArray(data.similartracks.track)) {
                                list = data.similartracks.track.map(function (track) {
                                    return {
                                        name: track.name,
                                        artist: track.artist.name,
                                        count: 1,
                                        score: parseFloat(track.match)
                                    };
                                });
                            }
                            else {
                                console.log('check');
                            }
                        }
                        else {
                            console.log('check');
                        }
                    }
                    else {
                        console.log('check');
                    }

                    for (var i = 0; i < list.length; i++) {
                        var similarTrack = list[i];

                        var found = false;
                        for (var j = 0; j < $scope.candidateTracks.length; j++) {
                            var candidateTrack = $scope.candidateTracks[j];
                            if (similarTrack.name == candidateTrack.name && similarTrack.artist == candidateTrack.artist) {
                                found = true;
                                candidateTrack.count++;
                                candidateTrack.score += parseFloat(similarTrack.score);
                            }
                        }

                        if (!found) {
                            for (var k = 0; k < $scope.sourceTracks.length; k++) {
                                var sourceTrack = $scope.sourceTracks[k];
                                if (similarTrack.artist == sourceTrack.artist && similarTrack.name == sourceTrack.name) {
                                    found = true;
                                }
                            }

                            if (!found) {
                                $scope.candidateTracks.push(similarTrack);

                                /*
                                if (!(similarTrack.artist in $scope.userTracks)) {
                                    $http({
                                        url: 'http://findgnosis.com/proxy/lastfm/library_gettracks',
                                        method: 'GET',
                                        params: {
                                            user: 'celston',
                                            limit: 100,
                                            artist: similarTrack.artist
                                        }
                                    }).success(function (data) {
                                        $scope.userTracks[similarTrack.artist] = data.tracks.track;
                                    });
                                }
                                else {
                                }
                                */
                            }
                        }
                    }
                })
            })
        })
    }
}])