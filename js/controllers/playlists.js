app.controller('PlaylistsController', ['$scope', '$http', 'spotifyApiService', function ($scope, $http, spotifyApi) {
    spotifyApi.getCurrentUserPlaylists().then(function (playlists) {
        $scope.currentPlaylists = playlists;
    })

    $scope.queue = [];
    $scope.sourceTracks = null;
    $scope.candidateTracks = null;
    $scope.userTracks = {};
    $scope.recommendedTracks = null;
    $scope.rebuilding = false;

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

    function processTrack(track) {
        $http({
            url: 'http://findgnosis.com/proxy/lastfm/track_getsimilar',
            method: 'GET',
            params: {
                artist: track.artists[0].name,
                track: track.name,
                limit: 10
            }
        }).success(function (data) {
            if (data.similartracks != null && data.similartracks.track != null) {
                var list = [].concat(data.similartracks.track);

                for (var i = 0; i < list.length; i++) {
                    var similarTrack = {
                        name: list[i].name,
                        artist: list[i].artist != null ? list[i].artist.name : '',
                        count: 1,
                        score: parseFloat(list[i].match)
                    };

                    if (similarTrack.artist == '') {
                        console.log(data.similartracks);
                    }

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
                        }
                    }
                }
            }

            processNextTrack();
        }).error(function (data) {
            processNextTrack();
        })

    }

    $scope.submit = function() {
        $scope.sourceTracks = [];
        $scope.candidateTracks = [];

        spotifyApi.getPlaylistTracks($scope.selectedPlaylist).then(function (tracks) {
            $scope.queue = tracks;
            $scope.sourceTracks = [];

            angular.forEach(tracks, function (track) {
                $scope.sourceTracks.push({
                    artist: track.artists[0].name,
                    name: track.name
                });
            })

            processNextTrack();
        })
    }
}])