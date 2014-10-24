app.controller('PlaylistsController', ['$scope', '$http', '$q', '$timeout', 'spotifyApiService', 'lastfmService', function ($scope, $http, $q, $timeout, spotifyApi, lastfm) {
    $scope.loadPlaylists = function () {
        spotifyApi.getCurrentUserPlaylists().then(function (playlists) {
            $scope.currentPlaylists = playlists;
        })
    }
    $scope.loadPlaylists();

    $scope.queue = [];
    $scope.sourceTracks = null;
    $scope.candidateTracks = null;
    $scope.userTracks = [];
    $scope.recommendedTracks = null;
    $scope.rebuilding = false;
    $scope.candidateTracksLoaded = 0;
    $scope.running;

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

    function normalizeTrackName(trackName) {
        return trackName
            .split(' [')[0]
            .split(' (')[0]
            .split(' - ')[0]
            .replace(/\b\w/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1);})
            .replace(/'\w/g, function (txt) { return txt.toLowerCase(); })
            ;
    }

    function rebuildRecommendedTracks() {
        if (!$scope.rebuilding) {
            $scope.recommendedTracks = [];
            $scope.rebuilding = true;

            angular.forEach($scope.candidateTracks, function (candidateTrack) {
                if (candidateTrack.artist in $scope.userTracks) {
                    angular.forEach($scope.userTracks[candidateTrack.artist], function (userTrack) {
                        if (candidateTrack.name == userTrack.name) {
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

    $scope.userTracksLoading = false;
    $scope.loadingUserTracksProgress = 0;
    function updateUserTracksProgress(progress) {
        $scope.loadingUserTracksProgress = progress;
    }

    function searchAndSnapshot(search, query, limit, callback) {
        search.Search.search(query).tracks.snapshot(0, limit)
            .done(function (snapshot) {
                snapshot.loadAll().done(function (snapshotTracks) {
                    callback(snapshotTracks);
                })
            })
            .fail(function () {
                callback([]);
            });
    }

    function createTemporaryPlaylist(callback) {
        spotifyApi.getModels().then(function (models) {
            models.Playlist.createTemporary((new Date()).toISOString()).done(function (playlist) {
                playlist.load('tracks').done(function (loadedPlaylist) {
                    callback(loadedPlaylist);
                })
            })
        })
    }

    function displayPlaylist(loadedPlaylist, elementId, fields, callback) {
        spotifyApi.getViewsList().then(function (List) {
            var list = List.forPlaylist(
                loadedPlaylist,
                {
                    fields: fields
                }
            );
            var e = document.getElementById(elementId);
            e.innerHTML = '';
            e.appendChild(list.node);
            list.init();
            callback();
        })
    }

    $scope.generatePlaylist = function () {
        var progress = 0;
        $scope.generatePlaylistProgress = 0;

        createTemporaryPlaylist(function (loadedPlaylist) {
            spotifyApi.getSearch().then(function (search) {
                var promises = [];

                angular.forEach($scope.userTracks, function (userTrack) {
                    var deferred = $q.defer();
                    promises.push(deferred.promise);
                    var query = 'artist:"' + userTrack.artist + '" ' + normalizeTrackName(userTrack.name) + ' NOT commentary NOT instrumental NOT karaoke NOT tribute';
                    searchAndSnapshot(search, query, userTrack.score, function (snapshotTracks) {
                        if (snapshotTracks.length > 0) {
                            var temp = [];

                            while (temp.length < userTrack.score) {
                                temp = temp.concat(snapshotTracks.slice(0, userTrack.score - temp.length));
                            }

                            deferred.resolve(temp);
                        }
                        else {
                            console.log('No results for "' + query + '"')
                            deferred.resolve([]);
                        }

                        progress++;
                        $scope.generatePlaylistProgress = progress / $scope.userTracks.length;
                    })
                });

                $q.all(promises).then(function (allTracks) {
                    var addPromises = [];

                    var temp = [];
                    angular.forEach(allTracks, function (tracks) {
                        temp = temp.concat(tracks.map(function (track) { return track.uri; }));

                        var deferred = $q.defer();
                        loadedPlaylist.tracks.add(tracks).done(function () {
                            deferred.resolve();
                        })
                        addPromises.push(deferred.promise);
                    })
                    $scope.playlistUris = temp.join("\n");

                    $q.all(addPromises).then(function () {
                        displayPlaylist(loadedPlaylist, 'generatedPlaylist', ['ordinal', 'image', 'track', 'artist', 'album', 'popularity'], function () {
                            $scope.running = false;
                        })
                    })
                })
            })
        });
    }

    $scope.loadUserTracks = function () {
        $scope.userTracksLoading = true;
        lastfm.userGetTopTracks('celston', '', updateUserTracksProgress).then(function (userTracks) {
            $scope.userTracks = [];

            angular.forEach(userTracks, function (userTrack) {
                var found = false;
                angular.forEach($scope.candidateTracks, function (candidateTrack) {
                    if (!candidateTrack.hasOwnProperty('artist') || !candidateTrack.hasOwnProperty('name')) {
                        console.log(candidateTrack);
                    }
                    else {
                        if (candidateTrack.artist == userTrack.artist.name && normalizeTrackName(candidateTrack.name) == normalizeTrackName(userTrack.name)) {
                            $scope.userTracks.push({
                                artist: userTrack.artist.name,
                                name: normalizeTrackName(userTrack.name),
                                playcount: userTrack.playcount,
                                match: candidateTrack.match,
                                scoreRaw: userTrack.playcount * candidateTrack.match,
                                score: Math.ceil(userTrack.playcount * candidateTrack.match)
                            })
                        }
                    }
                })
            })

            $scope.userTracks.sort(function (a, b) {
                return b.scoreRaw - a.scoreRaw;
            })
            $scope.userTracksLoading = false;
            $scope.generatePlaylist();
        })
    }

    $scope.loadCandidateTracks = function () {
        $scope.candidateTracksLoading = true;
        $scope.candidateTracksToBeLoaded = $scope.sourceTracks.length;
        $scope.candidateTracksLoaded = 0;

        $scope.candidateTracks = [];
        angular.forEach($scope.sourceTracks, function (sourceTrack) {
            $scope.candidateTracks.push({
                artist: sourceTrack.artist,
                name: normalizeTrackName(sourceTrack.name),
                match: 1
            })
        })

        var getSimilarPromises = [];
        angular.forEach($scope.sourceTracks, function (sourceTrack) {
            var deferred = $q.defer();

            lastfm.trackGetSimilar(sourceTrack.artist, normalizeTrackName(sourceTrack.name)).then(function (similarTracks) {
                deferred.resolve(similarTracks.map(function (similarTrack) { return { artist: similarTrack.artist.name, name: similarTrack.name, match: new Number(similarTrack.match) }; }));
                $scope.candidateTracksLoaded++;
            });

            getSimilarPromises.push(deferred.promise);
        })

        $q.all(getSimilarPromises).then(function (allSimilarTracks) {
            angular.forEach(allSimilarTracks, function (similarTracks) {
                angular.forEach(similarTracks, function (similarTrack) {
                    var found = false;

                    for (var i = 0; i < $scope.candidateTracks.length; i++) {
                        if (similarTrack.artist == $scope.candidateTracks[i].artist && normalizeTrackName(similarTrack.name) == normalizeTrackName($scope.candidateTracks[i].name)) {
                            found = true;
                            $scope.candidateTracks[i].match += similarTrack.match;
                        }
                    }

                    if (!found) {
                        $scope.candidateTracks.push(similarTrack);
                    }
                })
            })

            $scope.candidateTracks.sort(function (a, b) {
                return b.match - a.match;
            })
            $scope.candidateTracksLoading = false;
            $scope.loadUserTracks();
        });
    }

    $scope.submit = function() {
        $scope.running = true;
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

            $scope.loadCandidateTracks();
        })
    }
}])