app.controller('NavController', ['$scope', '$location', function ($scope, $location) {
    $scope.tabs = [
        {
            text: 'Home',
            path: 'home'
        },
        {
            text: 'Search',
            path: 'search'
        },
        {
            text: 'Playlists',
            path: 'playlists'
        },
        {
            text: 'Group Similar Tracks',
            path: 'groupSimilarTracks'
        }
    ];
    $scope.isActive = function (path) {
        return $location.path() == '/' + path;
    }
}])