var app = angular.module('gnosisApp', ['ngRoute']);

app.config(['$routeProvider', '$compileProvider', function ($routeProvider, $compileProvider) {
    $routeProvider
        .when('/home', {
            templateUrl: 'home.html',
            controller: 'HomeController'
        })
        .when('/foo', {
            templateUrl: 'foo.html',
            controller: 'FooController'
        })
        .when('/bar/:id', {
          templateUrl: 'bar.html',
          controller: 'BarController'
        })
        .otherwise({
            redirectTo: function() {
                console.log('check');
                return '/home';
            }
        });

    $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|sp):/);
}]);

app.controller('NavController', ['$scope', '$location', function ($scope, $location) {
    $scope.tabs = [
        {
            text: 'Home',
            path: 'home'
        },
        {
            text: 'Foo',
            path: 'foo'
        }
    ];
    $scope.isActive = function (path) {
        return $location.path() == '/' + path;
    }
}])

app.controller('HomeController', ['$scope', '$http', function ($scope, $http) {
    $scope.recentTracks = [];
    $http.get('http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=celston&api_key=59d09be6bab770f89ca6eeb33ae2b266&format=json').success(function (data) {
        $scope.recentTracks = data.recenttracks.track;
    });
}]);

app.controller('FooController', ['$scope', function ($scope) {
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
            console.log(args);
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

