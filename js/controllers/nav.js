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
        }
    ];
    $scope.isActive = function (path) {
        return $location.path() == '/' + path;
    }
}])