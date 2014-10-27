app.factory('spotifyApiService', ['$q', 'utilityService', function ($q, utility) {
    var service = {};

    service.starredTracksIndex = {};

    service.loadStarredTracksIndex = function () {
        var deferred = $q.defer();

        require(['$api/library#Library'], function (library) {
            library.forCurrentUser().starred.load('tracks').done(function (playlist) {
                playlist.tracks.snapshot().done(function (snapshot) {
                    var len = snapshot.length;
                    for (var i = 0; i < len; i++) {
                        var track = snapshot.get(i);
                        if (track !=- null) {
                            var curTrackName = utility.normalizeTrackName(track.name);
                            for (var j = 0; j < track.artists.length; j++) {
                                var curArtistName = utility.normalizeArtistName(track.artists[j].name);
                                if (!service.starredTracksIndex.hasOwnProperty(curArtistName)) {
                                    service.starredTracksIndex[curArtistName] = {};
                                }
                                if (!service.starredTracksIndex[curArtistName].hasOwnProperty(curTrackName)) {
                                    service.starredTracksIndex[curArtistName][curTrackName] = new Array();
                                }
                                service.starredTracksIndex[curArtistName][curTrackName].push({
                                    uri: track.uri,
                                    popularity: track.popularity
                                });
                            }
                        }
                    }
                    deferred.resolve();
                })
            })

        });

        return deferred.promise;
    }

    service.searchAndSnapshot = function (search, artist, track, limit) {
        var deferred = $q.defer();

        artist = utility.normalizeArtistName(artist);
        track = utility.normalizeTrackName(track);
        if (service.starredTracksIndex.hasOwnProperty(artist) && service.starredTracksIndex[artist].hasOwnProperty(track)) {
            deferred.resolve(service.starredTracksIndex[artist][track].slice(0, 1));
        }
        else {
            var query = 'artist:"' + artist + '" ' + track;

            search.Search.search(query).tracks.snapshot(0, limit)
                .done(function (snapshot) {
                    snapshot.loadAll()
                        .done(function (snapshotTracks) {
                            deferred.resolve(snapshotTracks);
                        })
                        .fail(function () {
                            console.log('Failed snapshot load');
                        })
                })
                .fail(function () {
                    deferred.resolve([]);
                });
        }

        return deferred.promise;
    }

    service.getCurrentUserPlaylists = function () {
        var deferred = $q.defer();

        require(['$api/library#Library'], function (library) {
            library.forCurrentUser().playlists.snapshot().done(function (snapshot) {
                var playlists = [];
                var len = snapshot.length;

                for (var i = 0; i < len; i++) {
                    playlists.push(snapshot.get(i));
                }

                deferred.resolve(playlists);
            })
        });

        return deferred.promise;
    }

    service.getPlaylistTracks = function (playlist) {
        var deferred = $q.defer();

        playlist.load('tracks').done(function (loadedPlaylist) {
            loadedPlaylist.tracks.snapshot().done(function (snapshot) {
                var len = snapshot.length;
                var tracks = [];
                for (var i = 0; i < len; i++) {
                    tracks.push(snapshot.get(i));
                }
                deferred.resolve(tracks);
            })
        })

        return deferred.promise;
    }

    service.addPlayerChangeEventListener = function (eventType, observer) {
        require(['$api/models'], function (models) {
            models.player.addEventListener(eventType, observer);
        })
    }

    service.getModels = function () {
        var deferred = $q.defer();

        require(['$api/models'], function (models) {
            deferred.resolve(models);
        });

        return deferred.promise;
    }

    service.getSearch = function () {
        var deferred = $q.defer();

        require(['$api/search'], function (search) {
            deferred.resolve(search);
        })

        return deferred.promise;
    }

    service.getViewsList = function () {
        var deferred = $q.defer();

        require(['$views/list'], function (list) {
            deferred.resolve(list.List);
        })

        return deferred.promise;
    }

    return service;
}])