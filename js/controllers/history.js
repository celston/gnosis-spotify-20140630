app.controller('HistoryController', ['$scope', '$q', 'lastfmService', 'spotifyApiService', function ($scope, $q, lastfm, spotifyApi) {
    $scope.topTracks = [];
    $scope.totalPlayCount = 0;
    $scope.totalTracks = 0;
    $scope.historyLoadingProgress = 0;
    $scope.period = '7day';
    $scope.historyIsLoading = false;

    function updateHistoryLoadingProgress(progress) {
        console.log(progress);
        $scope.historyLoadingProgress = progress;
    }

    $scope.loadHistory = function () {
        $scope.historyLoadingProgress = 0;
        $scope.historyIsLoading = true;
        lastfm.userGetTopTracks('celston', $scope.period, updateHistoryLoadingProgress).then(function (topTracks) {
            $scope.topTracks = topTracks.filter(function (track) { return track.playcount > 1; });
            $scope.totalTracks = $scope.topTracks.length;
            $scope.totalPlayCount = $scope.topTracks.map(function (track) { return new Number(track.playcount); }).reduce(function (previousValue, currentValue) { return previousValue + currentValue; });

            $scope.historyLoadingProgress = 0;
            $scope.historyIsLoading = false;
            /*
            createTemporaryPlaylist(function (loadedPlaylist) {
                spotifyApi.getSearch().then(function (search) {
                    var promises = [];

                    angular.forEach($scope.topTracks, function (topTrack) {
                        var deferred = $q.defer();
                        promises.push(deferred.promise);
                        var query = topTrack.artist.name.replace(' & ', '') + ' ' + topTrack.name + ' NOT cover NOT commentary NOT instrumental NOT karaoke';
                        searchAndSnapshot(search, query, topTrack.playcount, function (snapshotTracks) {
                            if (snapshotTracks.length > 0) {
                                var temp = [];
                                console.log(snapshotTracks);

                                while (temp.length < topTrack.playcount) {
                                    temp = temp.concat(snapshotTracks.slice(0, topTrack.playcount - temp.length));
                                }

                                deferred.resolve(temp);
                            }
                            else {
                                deferred.resolve([]);
                            }
                        })
                    });

                    $q.all(promises).then(function (allTracks) {
                        var addPromises = [];
                        angular.forEach(allTracks, function (tracks) {
                            var deferred = $q.defer();
                            loadedPlaylist.tracks.add(tracks).done(function () {
                                deferred.resolve();
                            })
                            addPromises.push(deferred.promise);
                        })

                        $q.all(addPromises).then(function () {
                            displayPlaylist(loadedPlaylist, 'historyPlaylist', ['ordinal', 'image', 'track', 'artist', 'album'], function () {
                                console.log('check');
                            })
                        })
                    })
                });
            })

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
            */
        })
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
            models.Playlist.create((new Date()).toISOString()).done(function (playlist) {
                playlist.load('tracks').done(function (loadedPlaylist) {
                    callback(loadedPlaylist);
                })
            })
        })
    }
}])