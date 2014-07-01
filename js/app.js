var app = angular.module('gnosisApp', []);

require([
    '$api/models',
], function(models) {

    app.

    function navigation() {
        var args = models.application.arguments;
        if (args) {
            var lastArg = args[args.length - 1];
            if (lastArg !== 'index' && lastArg !== 'tabs') {
                return;
            }
        }

        console.log(args);
    }

    // When application has loaded, run pages function
    models.application.load('arguments').done(navigation);

    // When arguments change, run pages function
    models.application.addEventListener('arguments', navigation);
});