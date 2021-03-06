var app = angular.module('gnosisApp', ['ngRoute', 'ui.bootstrap']);

app.config(['$routeProvider', '$compileProvider', function ($routeProvider, $compileProvider) {
    $routeProvider
        .when('/home', {
            templateUrl: 'home.html',
            controller: 'HomeController'
        })
        .when('/search', {
            templateUrl: 'search.html',
            controller: 'SearchController'
        })
        .when('/playlists', {
            templateUrl: 'playlists.html',
            controller: 'PlaylistsController'
        })
        .when('/groupSimilarTracks', {
            templateUrl: 'groupSimilarTracks.html',
            controller: 'GroupSimilarTracksController'
        })
        .when('/bar/:id', {
          templateUrl: 'bar.html',
          controller: 'BarController'
        })
        .when('/history', {
            templateUrl: 'history.html',
            controller: 'HistoryController'
        })
        .otherwise({
            redirectTo: function() {
                return '/home';
            }
        });

    $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|sp|spotify):/);
}]);



app.controller('SearchController', ['$scope', '$http', 'echoNestService', 'spotifyViewsService', function ($scope, $http, echoNest, spotifyViews) {
    $scope.results = [];

    $scope.search = function () {
        $scope.results = [];

        echoNest.songSearch({
            artist: $scope.artist,
            title: $scope.title
        }).success(function (data) {
            var tracks = [];
            angular.forEach(data.response.songs, function (song) {
                angular.forEach(song.tracks, function (track) {
                    tracks.push(track.foreign_id);
                })
            });

            spotifyViews.createLoadAndDisplayTemporaryPlaylist(tracks, 'search_playlist');
        });
    }
}]);

app.controller('BarController', ['$scope', '$routeParams', function ($scope, $routeParams) {
    $scope.id = $routeParams.id;
}]);

app.run(function ($rootScope, $location) {
    require([
        '$api/models',
    ], function(models) {

        function navigation() {
            var args = models.application.arguments;
            if (args) {
                var lastArg = args[args.length - 1];
                if (lastArg !== 'index' && lastArg !== 'tabs') {
                    return;
                }

                if (lastArg == 'index') {
                    args.pop();
                    var path = args.join('/');

                    $rootScope.$apply(function () {
                        $location.path('/' + path);
                    });
                }
            }
        }

        // When application has loaded, run pages function
        models.application.load('arguments').done(navigation);

        // When arguments change, run pages function
        models.application.addEventListener('arguments', navigation);
    });
})

