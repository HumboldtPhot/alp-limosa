import { RouterBuilder, RoutesTranslations } from 'limosa';

export default function alpLimosa(routerBuilder, controllers) {
    if (!controllers instanceof Map) {
        throw new Error('controllers should be a Map');
    }

    return function (app) {
        var config = app.config;
        var routeTranslationsConfig = config.get('routeTranslations');
        var routeTranslations = new RoutesTranslations(routeTranslationsConfig);
        var builder = new RouterBuilder(routeTranslations, config.get('availableLanguages'));
        routerBuilder(builder);
        var router = app.router = builder.router;

        app.context.urlGenerator = function () {
            return router.urlGenerator.apply(router, [this.language].concat(Array.prototype.slice.call(arguments))); // eslint-disable-line prefer-rest-params
        };

        app.controllers = controllers;

        /**
         *
         * @param {string} controllerName
         * @param {string} actionName
         * @returns {*}
         */
        app.context.callAction = function (controllerName, actionName) {
            var route = this.route;

            if (!actionName) {
                actionName = controllerName;
                controllerName = route.controller;
            }

            var controller = controllers.get(controllerName);
            if (!controller) {
                this.status = 404;
                throw new Error('Controller not found: ' + controllerName);
            }

            var action = controller[actionName];
            if (!action /* || !action.isAction*/) {
                    this.status = 404;
                    throw new Error('Action not found: ' + route.controller + '.' + route.action);
                }

            try {
                return Promise.resolve(controller[actionName].call(null, this));
            } catch (err) {
                return Promise.reject(err);
            }
        };

        return function (ctx) {
            var route = router.find(ctx.path);

            if (!route) {
                ctx.status = 404;
                throw new Error('Route not found: ' + ctx.path);
            }

            ctx.route = route;

            return ctx.callAction(route.controller, route.action);
        };
    };
}
//# sourceMappingURL=index.js.map