app.factory('utilityService', [function () {
    var service = {};

    service.normalizeTrackName = function (trackName) {
        return trackName
            .split(' [')[0]
            .split(' (')[0]
            .split(' - ')[0]
            .replace(/\b\w/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1);})
            .replace(/'\w/g, function (txt) { return txt.toLowerCase(); })
            ;
    }

    service.normalizeArtistName = function (artistName) {
        return artistName
            .replace(/^The /, '')
            .replace(/\b\w/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1);})
            .replace(/'\w/g, function (txt) { return txt.toLowerCase(); })
            .replace(' & ', ' and ')
            ;
    }

    return service;
}]);