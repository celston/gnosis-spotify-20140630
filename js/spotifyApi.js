app.factory('spotifyApiService', ['$q', function ($q) {
    var service = {};

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