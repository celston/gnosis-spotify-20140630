app.factory('spotifyViewsService', function () {
    var service = {};

    service.createLoadAndDisplayTemporaryPlaylist = function (trackUris, elementId) {
        require([
            '$api/models',
            '$views/list#List'
        ], function(models, List) {
            models.Playlist.createTemporary(Date.now().toString()).done(function (playlist) {
                playlist.load('tracks').done(function (loadedPlaylist) {
                    var tracks = [];
                    angular.forEach(trackUris, function (trackUri) {
                        tracks.push(models.Track.fromURI(trackUri));
                    });
                    loadedPlaylist.tracks.add(tracks).done(function () {
                        console.log('check');
                        var list = List.forPlaylist(loadedPlaylist, {
                            fields: ['ordinal', 'track', 'artist', 'album', 'popularity']
                        });

                        var e = document.getElementById(elementId);
                        while (e.firstChild) {
                            e.removeChild(e.firstChild);
                        }
                        e.appendChild(list.node);
                        list.init();
                    })
                });
            })
        });
    };

    return service;
});
