app.controller('NavController', ['$scope', '$location', function ($scope, $location) {
    $scope.tabs = [
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
        },
        {
            text: 'History',
            path: 'history'
        }
    ];
    $scope.isActive = function (path) {
        return $location.path() == '/' + path;
    }
}])