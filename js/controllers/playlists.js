app.controller('PlaylistsController', ['$scope', '$http', 'spotifyApiService', function ($scope, $http, spotifyApi) {
    spotifyApi.getCurrentUserPlaylists().then(function (playlists) {
        $scope.currentPlaylists = playlists;
    })

    $scope.foo = [];
    $scope.queue = [];

    function processNextTrack() {
        if ($scope.queue.length > 0) {
            var nextTrack = $scope.queue.pop();
            processTrack(nextTrack);
        }
        else {
            console.log($scope.foo);
        }
    }

    function processTrack(track) {
        console.log(track);
        $http({
            url: 'http://findgnosis.com/proxy/lastfm/track_getsimilar',
            method: 'GET',
            params: {
                artist: track.artists[0].name,
                track: track.name,
                limit: 10
            }
        }).success(function (data) {
            $scope.foo.push(data.similartracks.track);
            processNextTrack();
        }).error(function (data) {
            processNextTrack();
        })

    }

    $scope.submit = function() {
        spotifyApi.getPlaylistTracks($scope.selectedPlaylist).then(function (tracks) {
            $scope.queue = tracks;
            processNextTrack();
        })
    }
}])