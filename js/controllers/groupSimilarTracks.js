app.controller('GroupSimilarTracksController', ['$scope', '$http', '$q', '$timeout', 'spotifyApiService', function ($scope, $http, $q, $timeout, spotifyApi) {
    $scope.userPlaylists = [];
    $scope.sourceTracks = [];
    $scope.groups = [];
    $scope.showProgressBar = false;

    function normalizeTrackName(name) {
        return name
            .split(' - ', 1)[0]
            .toUpperCase()
            .replace(' (REMASTERED VERSION)', '')
            .replace(' (REMASTERED)', '')
            .trim()
            .replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();})
        ;
    }

    spotifyApi.getCurrentUserPlaylists().then(function (userPlaylists) {
        $scope.userPlaylists = userPlaylists;
    })

    $scope.submit = function() {

        spotifyApi.getPlaylistTracks($scope.sourcePlaylist).then(function (tracks) {
            $scope.showProgressBar = true;
            $scope.sourcePlaylistTrackCount = tracks.length;
            $scope.progress = 0;
            var promises = [];

            angular.forEach(tracks, function (track) {
                var deferred = $q.defer();
                promises.push(deferred.promise);

                var sourceTrack = {
                    artist: track.artists[0].name,
                    name: normalizeTrackName(track.name)
                };

                $http({
                    url: 'http://findgnosis.com/proxy/lastfm/track_getsimilar',
                    method: 'GET',
                    params: {
                        artist: sourceTrack.artist,
                        track: sourceTrack.name,
                        limit: 15
                    }
                }).success(function (data) {
                    if ('similartracks' in data) {
                        if ('track' in data.similartracks) {
                            if (Array.isArray(data.similartracks.track)) {
                                sourceTrack.similar = data.similartracks.track.map(function (track) {
                                    return {
                                        name: normalizeTrackName(track.name),
                                        score: parseFloat(track.match),
                                        count: 1,
                                        artist: track.artist.name
                                    };
                                });
                            }
                            else {
                                sourceTrack.similar = [
                                    {
                                        name: data.similartracks.track,
                                        artist: data.similartracks.artist
                                    }
                                ];
                            }
                        }
                        else {
                            console.log('check');
                        }
                    }
                    else {
                        console.log('check');
                    }

                    $scope.progress++;
                    deferred.resolve(sourceTrack);
                }).error(function (data) {
                    $scope.progress++;
                    sourceTrack.similar = [];
                    deferred.resolve(sourceTrack);
                });

            })

            $q.all(promises).then(function (sourceTracks) {
                $scope.showProgressBar = false;
                var groups = [];

                angular.forEach(sourceTracks, function (sourceTrack) {
                    groups.push({
                        tracks: [
                            sourceTrack
                        ]
                    })
                })

                var combinationMade = true;
                while (combinationMade) {
                    combinationMade = false;
                    console.log(groups);
                    var newGroups = [];

                    for (var i = 0; i < groups.length; i++) {
                        var group1 = groups[i];
                        var newGroup = {
                            tracks: [].concat(group1.tracks)
                        };
                        for (var j = i + 1; j < groups.length; j++) {
                            var group2 = groups[j];

                            var found = false;
                            angular.forEach(group1.tracks, function (group1Track) {
                                angular.forEach(group2.tracks, function (group2Track) {
                                    angular.forEach(group2Track.similar, function (group2TrackSimilar) {
                                        if (!found && group1Track.artist == group2TrackSimilar.artist && group1Track.name == group2TrackSimilar.name) {
                                            found = true;
                                            combinationMade = true;
                                            newGroup.tracks = newGroup.tracks.concat(group2.tracks);
                                        }
                                    })

                                    angular.forEach(group1Track.similar, function (group1TrackSimilar) {
                                        if (!found && group1TrackSimilar.artist == group2Track.artist && group1TrackSimilar.name == group2Track.name) {
                                            found = true;
                                            combinationMade = true;
                                            newGroup.tracks = newGroup.tracks.concat(group2.tracks);
                                        }
                                    })
                                })
                            })

                            if (found) {
                                group2.tracks = [];
                            }
                        }

                        if (newGroup.tracks.length > 0) {
                            newGroups.push(newGroup);
                        }
                    }

                    groups = [].concat(newGroups);
                    console.log('-----')
                }

                $scope.groups = groups;

                angular.forEach($scope.groups, function (group) {
                    group.suggestions = [];
                    angular.forEach(group.tracks, function (track) {
                        angular.forEach(track.similar, function (similarTrack) {
                            var found = false;

                            var filteredGroupTracks = group.tracks.filter(function (track2) {
                                return track2.artist == similarTrack.artist && track2.name == similarTrack.name;
                            })
                            if (filteredGroupTracks.length == 0) {
                                angular.forEach(group.suggestions, function (suggestion) {
                                    if (suggestion.artist == similarTrack.artist && suggestion.name == similarTrack.name) {
                                        suggestion.score += similarTrack.score;
                                        found = true;
                                    }
                                })
                                if (!found) {
                                    group.suggestions.push(similarTrack);
                                }
                            }
                        })
                    })
                })
            })
        });

    }
}]);