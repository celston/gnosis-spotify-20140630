app.controller('HomeController', ['$scope', '$http', '$q', 'spotifyApiService', 'utilityService', function ($scope, $http, $q, spotifyApi, utility) {
    $scope.recentTracks = [];
    $scope.recentTracksSimilarIsLoading = false;
    $scope.recentTracksSimilarError = '';

    $scope.topArtists = [];

    $scope.currentTrackArtist = '';
    $scope.currentTrackArtistUri = '';
    $scope.currentTrackName = '';
    $scope.currentTrackAlbum = '';
    $scope.currentTrackAlbumUri = '';

    $scope.currentTrackSimilarIsLoading = false;
    $scope.currentTrackSimilarTracksFound = false;
    $scope.currentTrackSimilarError = '';

    $scope.currentTrackArtistTopTracksIsLoading = false;
    $scope.currentTrackUserArtistTopTracksIsLoading = false;

    spotifyApi.loadStarredTracksIndex().then(function () {
        console.log('loadStarredTracksIndex');
        console.log(spotifyApi.starredTracksIndex);

        spotifyApi.getModels().then(function (models) {
            models.player.load('track').done(function (player) {
                updateCurrentTrack(player.track);
                updateRecentTracks();
            })
        })
    });

    $scope.updateCurrentTrackArtistTopTracks = function () {
        $scope.currentTrackArtistTopTracksIsLoading = true;

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
                        angular.forEach(response.data.toptracks.track, function (artistTopTrack) {
                            var deferred = $q.defer();
                            promises.push(deferred.promise);

                            spotifyApi.searchAndSnapshot(search, artistTopTrack.artist.name, artistTopTrack.name, 1).then(
                                function (snapshotTracks) {
                                    deferred.resolve(snapshotTracks);
                                }),
                                function () {
                                    console.log('Failed search')
                                    deferred.resolve([]);
                                }
                        });

                        $q.all(promises).then(function (allSnapshotTracks) {
                            var addPromises = [];

                            angular.forEach(allSnapshotTracks, function (snapshotTracks) {
                                var deferred = $q.defer();
                                addPromises.push(deferred.promise);

                                loadedPlaylist.tracks.add(snapshotTracks)
                                    .done(function () {
                                        deferred.resolve();
                                    })
                                    .fail(function() {
                                        console.log('Failed to add tracks');
                                        deferred.resolve();
                                    });
                            });

                            $q.all(addPromises).then(function () {
                                displayPlaylist(loadedPlaylist, 'currentTrackArtistTopTracksPlaylist', ['ordinal', 'image', 'track', 'album', 'popularity'], function () {
                                    $scope.currentTrackArtistTopTracksIsLoading = false;
                                });
                            })
                        });
                    });
                })


            }
            $scope.currentTrackArtistTopTracksIsLoading = false;
        })
    }

    $scope.updateCurrentTrackArtistUserTopTracks = function () {
        $scope.currentTrackUserArtistTopTracksIsLoading = true;

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
            console.log('check 1');
            console.log(data);
            if (data.hasOwnProperty('tracks') && data.tracks.hasOwnProperty('track') && Array.isArray(data.tracks.track)) {
                console.log('check 2');
                data.tracks.track.sort(function (a, b) {
                    return b.playcount - a.playcount;
                })
                createTemporaryPlaylist(function (loadedPlaylist) {
                    console.log('check 1');
                    spotifyApi.getSearch().then(function (search) {
                        var promises = [];
                        angular.forEach(data.tracks.track, function (libraryTrack) {
                            var deferred = $q.defer();
                            promises.push(deferred.promise);

                            spotifyApi.searchAndSnapshot(search, libraryTrack.artist.name, libraryTrack.name, 1).then(
                                function (snapshotTracks) {
                                    deferred.resolve(snapshotTracks);
                                }),
                                function () {
                                    console.log('Failed search...');
                                    deferred.resolve([]);
                                }
                        });
                        console.log(promises.length);

                        $q.all(promises).then(function (allSnapshotTracks) {
                            console.log('check 1');
                            var addPromises = [];

                            angular.forEach(allSnapshotTracks, function (snapshotTracks) {
                                var deferred = $q.defer();
                                addPromises.push(deferred.promise);
                                loadedPlaylist.tracks.add(snapshotTracks).done(function () {
                                    deferred.resolve();
                                });
                            })

                            $q.all(addPromises).then(function () {
                                displayPlaylist(loadedPlaylist, 'currentTrackUserArtistTopTracksPlaylist', ['ordinal', 'image', 'track', 'album', 'popularity'], function () {
                                    $scope.currentTrackUserArtistTopTracksIsLoading = false;
                                });
                            })
                        });
                    });
                })
            }
        }).error(function () {
            console.log('mrah');
        });
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

    function updateCurrentTrack(track) {
        var currentTrackArtist = track.artists.map(function (artist) { return artist.name; }).join(', ')
        var currentTrackName = normalizeTrackName(track.name);

        if ($scope.currentTrackArtist != currentTrackArtist || $scope.currentTrackName != currentTrackName) {
            if ($scope.currentTrackArtist != currentTrackArtist) {
                $scope.currentTrackArtist = currentTrackArtist;
                $scope.currentTrackArtistUri = track.artists.map(function (artist) { return artist.uri; })[0];

                $scope.updateCurrentTrackArtistTopTracks();
                $scope.updateCurrentTrackArtistUserTopTracks();
            }

            $scope.currentTrackName = currentTrackName;
            $scope.currentTrackSimilarIsLoading = true;
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
                                    displayPlaylist(loadedPlaylist, 'currentTrackSimilarPlaylist', ['ordinal', 'image', 'track', 'artist', 'album', 'popularity'], function () {
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

            spotifyApi.getModels().then(function (models) {
                $scope.currentTrackAlbumUri = track.album.uri;
                models.Album.fromURI(track.album.uri).load('name').done(function (album) {
                    $scope.currentTrackAlbum = album.name;
                })
            });
        }
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

                        angular.forEach(result.slice(0, 20), function (similarTrack) {
                            var deferred = $q.defer();
                            promises2.push(deferred.promise);

                            search.Search.search(similarTrack.artist.name + ' ' + similarTrack.name).tracks.snapshot(0, 1).done(function (snapshot) {
                                snapshot.loadAll().done(function (snapshotTracks) {
                                    loadedPlaylist.tracks.add(snapshotTracks);
                                    deferred.resolve();
                                })
                            });
                        })

                        $q.all(promises2).then(function () {
                            displayPlaylist(loadedPlaylist, 'recentTracksSimilarPlaylist', ['ordinal', 'image', 'track', 'artist', 'album'], function () {
                                $scope.recentTracksSimilarIsLoading = false;
                            });
                        })
                    })
                })
            })
        });
    }

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
