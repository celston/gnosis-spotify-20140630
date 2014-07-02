app.factory('echoNestService', ['$http', function($http) {
    var service = {};

    service.songSearch = function (request) {
        request.api_key = 'ARFPS15ATHSWB2EWQ';
        request.format = 'json';
        request.results = 100;
        request.bucket = [
            'id:spotify-WW',
            'tracks'
        ];
        request.sort = 'song_hotttnesss-desc';

        return $http({
            url: 'http://developer.echonest.com/api/v4/song/search',
            method: 'GET',
            params: request
        });
    }

    return service;
}]);