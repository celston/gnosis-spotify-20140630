app.controller('HomeController', ['$scope', '$http', '$q', 'spotifyApiService', function ($scope, $http, $q, spotifyApi) {
    $scope.recentTracks = [];
    $scope.recentTracksSimilarIsLoading = false;
    $scope.recentTracksSimilarError = '';

    $scope.topArtists = [];

    $scope.currentTrackArtist = '';
    $scope.currentTrackName = '';
    $scope.currentTrackAlbum = '';

    $scope.currentTrackSimilarIsLoading = false;
    $scope.currentTrackSimilarTracksFound = false;
    $scope.currentTrackSimilarError = '';

    $scope.currentTrackArtistTopTracksIsLoading = false;
    $scope.currentTrackUserArtistTopTracksIsLoading = false;

    function normalizeTrackName(trackName) {
        return trackName
            .split(' [')[0]
            .split(' (')[0]
            .split(' - ')[0]
            .replace(/\b\w/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1);})
            .replace(/'\w/g, function (txt) { return txt.toLowerCase(); })
        ;
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

    function displayPlaylist(loadedPlaylist, elementId, callback) {
        spotifyApi.getViewsList().then(function (List) {
            var list = List.forPlaylist(
                loadedPlaylist,
                {
                    fields: ['track', 'artist', 'album']
                }
            );
            var e = document.getElementById(elementId);
            e.innerHTML = '';
            e.appendChild(list.node);
            list.init();
            callback();
        })
    }

    function lastfmTrackGetSimilar(artist, track) {
        var promise = $http({
            url: 'http://findgnosis.com/proxy/lastfm/track.getsimilar',
            method: 'GET',
            params: {
                artist: artist,
                track: track
            }
        });

        return promise
            .then(function (response) {
                if (response.data.hasOwnProperty('similartracks') && response.data.similartracks.hasOwnProperty('track') && Array.isArray(response.data.similartracks.track)) {
                    return response.data.similartracks.track;
                }
                return null;
            })
            .catch(function () {
                return null;
            })
    }

    function searchAndSnapshot(search, query, limit, callback) {
        search.Search.search(query).tracks.snapshot(0, limit).done(function (snapshot) {
            snapshot.loadAll().done(function (snapshotTracks) {
                callback(snapshotTracks);
            })
        });
    }

    function updateCurrentTrack(track) {
        spotifyApi.getModels().then(function (models) {
            models.Album.fromURI(track.album.uri).load('name').done(function (album) {
                $scope.currentTrackAlbum = album.name;
            })
        })

        $scope.currentTrackArtist = track.artists.map(function (artist) { return artist.name; }).join(', ');
        $scope.currentTrackName = normalizeTrackName(track.name);
        $scope.currentTrackSimilarIsLoading = true;
        $scope.currentTrackArtistTopTracksIsLoading = true;
        $scope.currentTrackUserArtistTopTracksIsLoading = true;

        lastfmTrackGetSimilar($scope.currentTrackArtist, $scope.currentTrackName).then(function (similarTracks) {
            if (Array.isArray(similarTracks)) {
                createTemporaryPlaylist(function (loadedPlaylist) {
                    spotifyApi.getSearch().then(function (search) {
                        var promises = [];

                        angular.forEach(similarTracks.slice(0, 10), function (similarTrack) {
                            var deferred = $q.defer();
                            promises.push(deferred.promise);

                            search.Search.search(similarTrack.artist.name + ' ' + similarTrack.name).tracks.snapshot(0, 2).done(function (snapshot) {
                                snapshot.loadAll().done(function (snapshotTracks) {
                                    deferred.resolve(snapshotTracks);
                                })

                            });
                        })

                        $q.all(promises).then(function (allSnapshotTracks) {
                            var addPromises = [];

                            angular.forEach(allSnapshotTracks, function (snapshotTracks) {
                                var deferred = $q.defer();
                                addPromises.push(deferred.promise);
                                loadedPlaylist.tracks.add(snapshotTracks).done(function () {
                                    deferred.resolve();
                                });
                            })

                            $q.all(addPromises).then(function () {
                                displayPlaylist(loadedPlaylist, 'currentTrackSimilarPlaylist', function () {
                                    $scope.currentTrackUserArtistTopTracksIsLoading = false;
                                });
                            })
                        })
                    })
                })

                $scope.currentTrackSimilarFound = true;
            }
            else {
                $scope.currentTrackSimilarFound = false;
            }
            $scope.currentTrackSimilarIsLoading = false;
        })

        $http({
            url: 'http://findgnosis.com/proxy/lastfm/artist.gettoptracks',
            method: 'GET',
            params: {
                artist: $scope.currentTrackArtist
            }
        }).then(function (response) {
            if (response.data.hasOwnProperty('toptracks') && response.data.toptracks.hasOwnProperty('track') && Array.isArray(response.data.toptracks.track)) {
                createTemporaryPlaylist(function (loadedPlaylist) {
                    spotifyApi.getSearch().then(function (search) {
                        var promises = [];
                        angular.forEach(response.data.toptracks.track.slice(0, 10), function (artistTopTrack) {
                            var deferred = $q.defer();
                            promises.push(deferred.promise);

                            searchAndSnapshot(search, artistTopTrack.artist.name + ' ' + normalizeTrackName(artistTopTrack.name), 2, function (snapshotTracks) {
                                loadedPlaylist.tracks.add(snapshotTracks);
                                deferred.resolve();
                            })
                        });

                        $q.all(promises).then(function () {
                            displayPlaylist(loadedPlaylist, 'currentTrackArtistTopTracksPlaylist', function () {
                                $scope.currentTrackArtistTopTracksIsLoading = false;
                            });
                        });
                    });
                })


            }
            $scope.currentTrackArtistTopTracksIsLoading = false;
        })

        $http({
            url: 'http://ws.audioscrobbler.com/2.0/',
            method: 'GET',
            params: {
                api_key: '59d09be6bab770f89ca6eeb33ae2b266',
                format: 'json',
                method: 'library.gettracks',
                user: 'celston',
                limit: 250,
                artist: $scope.currentTrackArtist
            }
        }).success(function (data) {
            if (data.hasOwnProperty('tracks') && data.tracks.hasOwnProperty('track') && Array.isArray(data.tracks.track)) {
                data.tracks.track.sort(function (a, b) {
                    return b.playcount - a.playcount;
                })
                createTemporaryPlaylist(function (loadedPlaylist) {
                    spotifyApi.getSearch().then(function (search) {
                        var promises = [];
                        angular.forEach(data.tracks.track.slice(0, 20), function (libraryTrack) {
                            var deferred = $q.defer();
                            promises.push(deferred.promise);

                            searchAndSnapshot(search, libraryTrack.artist.name + ' ' + normalizeTrackName(libraryTrack.name), 2, function (snapshotTracks) {
                                deferred.resolve(snapshotTracks);
                            })
                        });

                        $q.all(promises).then(function (allSnapshotTracks) {
                            var addPromises = [];

                            angular.forEach(allSnapshotTracks, function (snapshotTracks) {
                                var deferred = $q.defer();
                                addPromises.push(deferred.promise);
                                loadedPlaylist.tracks.add(snapshotTracks).done(function () {
                                    deferred.resolve();
                                });
                            })

                            $q.all(addPromises).then(function () {
                                displayPlaylist(loadedPlaylist, 'currentTrackUserArtistTopTracksPlaylist', function () {
                                    $scope.currentTrackUserArtistTopTracksIsLoading = false;
                                });
                            })
                        });
                    });
                })
            }
        });
    }

    function updateRecentTracks() {
        $scope.recentTracksSimilarIsLoading = true;
        $http.get('http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=celston&api_key=59d09be6bab770f89ca6eeb33ae2b266&format=json').success(function (data) {
            $scope.recentTracks = data.recenttracks.track;

            var promises = [];
            angular.forEach($scope.recentTracks, function (recentTrack){
                promises.push(lastfmTrackGetSimilar(recentTrack.artist['#text'], normalizeTrackName(recentTrack.name)));
            })

            $q.all(promises).then(function (allData) {
                var result = [];

                angular.forEach(allData, function (data) {
                    if (Array.isArray(data)) {
                        var found = false;
                        angular.forEach(data, function (similarTrack) {
                            angular.forEach(result, function (existing) {
                                if (existing.artist.name == similarTrack.artist.name && existing.name == similarTrack.name) {
                                    found = true;
                                    existing.match += similarTrack.match;
                                }
                            })
                            if (!found) {
                                result.push(similarTrack);
                            }
                        })
                    }
                })

                result.sort(function (a, b) {
                    return b.match - a.match;
                })

                createTemporaryPlaylist(function (loadedPlaylist) {
                    spotifyApi.getSearch().then(function (search) {
                        var promises2 = [];

                        angular.forEach(result.slice(0, 10), function (similarTrack) {
                            var deferred = $q.defer();
                            promises2.push(deferred.promise);

                            search.Search.search(similarTrack.artist.name + ' ' + similarTrack.name).tracks.snapshot(0, 2).done(function (snapshot) {
                                snapshot.loadAll().done(function (snapshotTracks) {
                                    loadedPlaylist.tracks.add(snapshotTracks);
                                    deferred.resolve();
                                })
                            });
                        })

                        $q.all(promises2).then(function () {
                            displayPlaylist(loadedPlaylist, 'recentTracksSimilarPlaylist', function () {
                                $scope.recentTracksSimilarIsLoading = false;
                            });
                        })
                    })
                })
            })
        });
    }

    spotifyApi.getModels().then(function (models) {
        models.player.load('track').done(function (player) {
            updateCurrentTrack(player.track);
            updateRecentTracks();
        })
    })

    spotifyApi.addPlayerChangeEventListener('change', function (event) {
        $scope.$apply(function () {
            updateCurrentTrack(event.data.track);
            updateRecentTracks();
        })
    });

    var d = new Date();

    $http({
        url: 'http://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=celston&period=1month&limit=200&api_key=59d09be6bab770f89ca6eeb33ae2b266&format=json&cache=' + d.getTime(),
        method: 'GET',
        cache: false
    }).success(function (data) {
        $scope.topArtists = data.topartists.artist;
    });
}]);
